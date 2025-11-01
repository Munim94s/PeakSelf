import dotenv from 'dotenv';
dotenv.config();

import pool from '../utils/db.js';
import logger from '../utils/logger.js';

const samplePosts = [
  {
    title: "Getting Started with Modern Web Development",
    content: `# Introduction\n\nWeb development has evolved significantly over the years. In this article, we'll explore the fundamentals of modern web development.\n\n## Key Technologies\n\n- React and Vue.js for frontend\n- Node.js and Express for backend\n- PostgreSQL for database\n\n## Best Practices\n\n1. Write clean, maintainable code\n2. Follow security best practices\n3. Optimize for performance\n\n## Conclusion\n\nModern web development requires continuous learning and adaptation to new technologies.`,
    excerpt: "Explore the fundamentals of modern web development and learn about key technologies and best practices.",
    status: "published"
  },
  {
    title: "10 Tips for Boosting Your Productivity",
    content: `# Productivity Tips\n\nMaximize your efficiency with these proven strategies.\n\n## 1. Time Blocking\n\nAllocate specific time blocks for different tasks throughout your day.\n\n## 2. Eliminate Distractions\n\nTurn off notifications and create a focused work environment.\n\n## 3. Take Regular Breaks\n\nUse the Pomodoro technique: 25 minutes of work followed by 5-minute breaks.\n\n## Conclusion\n\nConsistency is key to building productive habits.`,
    excerpt: "Maximize your efficiency with these proven productivity strategies and time management techniques.",
    status: "published"
  },
  {
    title: "Understanding JavaScript Async/Await",
    content: `# Asynchronous JavaScript\n\nAsync/await makes asynchronous code look and behave more like synchronous code.\n\n## Basic Example\n\n\`\`\`javascript\nasync function fetchData() {\n  try {\n    const response = await fetch('/api/data');\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error('Error:', error);\n  }\n}\n\`\`\`\n\n## Error Handling\n\nAlways use try/catch blocks to handle errors in async functions.\n\n## Conclusion\n\nAsync/await simplifies promise-based code and improves readability.`,
    excerpt: "Learn how to use async/await in JavaScript to write cleaner asynchronous code.",
    status: "published"
  },
  {
    title: "The Art of Effective Communication",
    content: `# Communication Skills\n\nEffective communication is essential for personal and professional success.\n\n## Key Principles\n\n- Listen actively\n- Be clear and concise\n- Show empathy\n- Give constructive feedback\n\n## In the Workplace\n\nGood communication builds trust and fosters collaboration.\n\n## Conclusion\n\nMastering communication takes practice but pays dividends throughout your career.`,
    excerpt: "Master the essential skills of effective communication in both personal and professional settings.",
    status: "published"
  },
  {
    title: "Building Scalable APIs with Node.js",
    content: `# API Development\n\nLearn how to build robust, scalable APIs using Node.js and Express.\n\n## Architecture\n\n- RESTful design principles\n- Proper error handling\n- Authentication and authorization\n- Rate limiting\n\n## Database Integration\n\nUse connection pooling for efficient database access.\n\n## Conclusion\n\nBuilding scalable APIs requires careful planning and adherence to best practices.`,
    excerpt: "Learn how to build robust, scalable APIs using Node.js, Express, and modern best practices.",
    status: "published"
  },
  {
    title: "Mastering CSS Grid and Flexbox",
    content: `# Modern CSS Layout\n\nCSS Grid and Flexbox are powerful tools for creating responsive layouts.\n\n## When to Use Grid\n\n- Two-dimensional layouts\n- Complex page structures\n\n## When to Use Flexbox\n\n- One-dimensional layouts\n- Component-level alignment\n\n## Conclusion\n\nCombining Grid and Flexbox gives you maximum layout flexibility.`,
    excerpt: "Master modern CSS layout techniques with Grid and Flexbox for responsive web design.",
    status: "published"
  }
];

async function seedBlogPosts() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting blog posts seed...');
    
    // Get first admin user as author
    const userResult = await client.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    
    if (userResult.rows.length === 0) {
      logger.error('No admin user found. Please create an admin user first.');
      return;
    }
    
    const authorId = userResult.rows[0].id;
    
    await client.query('BEGIN');
    
    // Clear existing posts (optional - comment out if you want to keep existing posts)
    // await client.query('DELETE FROM blog_post_tags');
    // await client.query('DELETE FROM blog_posts');
    
    for (const post of samplePosts) {
      const slug = post.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const result = await client.query(
        `INSERT INTO blog_posts (title, content, excerpt, slug, status, author_id, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (slug) DO UPDATE
         SET title = EXCLUDED.title,
             content = EXCLUDED.content,
             excerpt = EXCLUDED.excerpt,
             status = EXCLUDED.status
         RETURNING id, title`,
        [post.title, post.content, post.excerpt, slug, post.status, authorId]
      );
      
      logger.info(`✓ Seeded: ${result.rows[0].title}`);
    }
    
    await client.query('COMMIT');
    logger.info(`✓ Successfully seeded ${samplePosts.length} blog posts`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error seeding blog posts:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedBlogPosts()
  .then(() => {
    logger.info('Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Seed failed:', error);
    process.exit(1);
  });
