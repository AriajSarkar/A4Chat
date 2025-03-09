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
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Analyze these git commits and provide a clear, concise summary of changes. Focus on features, improvements, and fixes. Format as bullet points categorized by type (Features, Bug Fixes, etc):\n\n${commits}`
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

    // Verify summary has bullet points
    expect(summary).toMatch(/[•*-]\s/);
    
    // Save summary to file for inspection
    if (require.main === module) {
      const content = `## Release Summary Test\n${new Date().toISOString().slice(0, 10)}\n\n${summary}`;
      fs.writeFileSync('test_summary.md', content);
      console.log('Summary saved to test_summary.md');
    }
  }, 30000); // Increase timeout for API call
});
