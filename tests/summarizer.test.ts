import { execSync } from 'child_process';
import axios from 'axios';
import fs from 'fs';

import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + '/.env' });

describe('Commit Summarizer', () => {
  // Skip these tests if no API key is available
  const apiKey = process.env.GEMINI_API_KEY;
  const runApiTests = apiKey !== undefined;
  
  // Helper function to get commits since last tag
  const getCommits = (): string => {
    try {
      // Try to get the last tag
      const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo HEAD~10', 
        { encoding: 'utf8' }).trim();
      console.log(`Using last tag: ${lastTag}`);
      
      // Get commits since the last tag
      let commits = execSync(`git log --pretty=format:"%h %s" ${lastTag}..HEAD`, 
        { encoding: 'utf8' }).trim();
      
      // If no commits found, get the last 5 commits
      if (!commits) {
        console.log('No commits found since last tag, using last 5 commits instead');
        commits = execSync('git log --pretty=format:"%h %s" -n 5', { encoding: 'utf8' }).trim();
      }
      
      return commits;
    } catch (error) {
      console.error('Error getting commits:', error);
      return '';
    }
  };

  // Test that we can get commits from git
  test('can get commits from git repository', () => {
    const commits = getCommits();
    expect(commits).toBeTruthy();
    const commitLines = commits.split('\n');
    expect(commitLines.length).toBeGreaterThan(0);
    console.log(`Found ${commitLines.length} commits`);
  });

  // Test that we can summarize commits using Gemini API
  test('can summarize commits with Gemini API', async () => {
    // Skip test if no API key is available
    if (!runApiTests) {
      console.log('Skipping API test - no GEMINI_API_KEY environment variable found');
      return;
    }

    const commits = getCommits();
    expect(commits).toBeTruthy();

    // Call Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        system_instruction: {
          parts: [
            {
              text: "You are a commit summarizer for a changelog. Your job is to analyze git commits and organize them into logical categories with clear, concise explanations. Focus on the substance of each change, not the commit format. Use descriptive bullet points that explain the actual change rather than just repeating the commit message. Group similar changes together. Include emoji category headers for better readability. Always emphasize user-facing features and important fixes."
            }
          ]
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Analyze these git commits and provide a clear, concise summary of changes. Format as bullet points categorized by type with emojis like:

### ✨ Features
- Feature 1 description
- Feature 2 description

### ⚙ Improvements
- Improvement 1 description

### 🐛 Bug Fixes
- Bug fix 1 description

### 🧹 Chores
- Chore 1 description

### 📝 Documentation
- Doc change 1 description

### 🔀 Merges
- Merge 1 description

Be thorough and descriptive, but concise. Do not include commit hashes. Only include categories that have relevant commits:\n\n${commits}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Verify response structure
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.candidates).toBeDefined();
    expect(response.data.candidates[0].content.parts[0].text).toBeDefined();

    const summary = response.data.candidates[0].content.parts[0].text;
    expect(summary.length).toBeGreaterThan(0);

    // Display the summary
    console.log('COMMIT SUMMARY:');
    console.log(summary);

    // Verify summary has bullet points and categories
    expect(summary).toMatch(/###\s+[✨⚙🐛🧹📝🔀]/u); // Should have at least one category header
    expect(summary).toMatch(/[•*-]\s/); // Should have bullet points
    
    // Save summary to file for inspection
    if (require.main === module) {
      const content = `## Release Summary Test\n${new Date().toISOString().slice(0, 10)}\n\n${summary}`;
      fs.writeFileSync('test_summary.md', content);
      console.log('Summary saved to test_summary.md');
    }
  }, 30000); // Increase timeout for API call
  
  // Test changelog section replacement functionality
  test('can replace first section of changelog', () => {
    // Create a mock changelog
    const mockChangelog = `## [v1.0.0] - 2023-01-01

### ✨ Features
- First feature
- Second feature

## [v0.9.0] - 2022-12-01

### ✨ Features
- Old feature
- Another old feature`;

    const newSection = `## [v1.1.0] - 2023-02-01

### ✨ Features
- New feature
- Another new feature

### 🐛 Bug Fixes
- Fixed a critical bug`;

    // Extract the second version header position
    const lines = mockChangelog.split('\n');
    let secondHeaderIndex = -1;
    let headerCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^## \[.*\]/)) {
        headerCount++;
        if (headerCount === 2) {
          secondHeaderIndex = i;
          break;
        }
      }
    }
    
    // Get content starting from the second header
    const remainingContent = secondHeaderIndex !== -1 
      ? lines.slice(secondHeaderIndex).join('\n')
      : '';
      
    // Create updated changelog
    const updatedChangelog = `${newSection}\n\n${remainingContent}`;
    
    // Verify the first section was replaced
    expect(updatedChangelog).toContain('## [v1.1.0]');
    expect(updatedChangelog).toContain('## [v0.9.0]');
    expect(updatedChangelog).not.toContain('## [v1.0.0]');
    expect(updatedChangelog).toContain('New feature');
    expect(updatedChangelog).toContain('Fixed a critical bug');
    expect(updatedChangelog).toContain('Old feature');
    expect(updatedChangelog).not.toContain('First feature');
  });
});
