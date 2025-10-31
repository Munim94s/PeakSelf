# Tags/Categories System Setup

A complete tags/categories system has been implemented for your blog. Here's what was added:

## Backend Changes

### 1. Database Migration
- **File**: `server/migrations/create_tags.js`
- Creates `tags` table with columns: id, name, slug, color, created_at, updated_at
- Creates `blog_post_tags` junction table for many-to-many relationship
- **Run migration**: `npm run migrate create_tags`

### 2. Tags API Routes
- **File**: `server/routes/admin/tags.js`
- Full CRUD operations for tags:
  - `GET /api/admin/tags` - List all tags with post count
  - `GET /api/admin/tags/:id` - Get single tag
  - `POST /api/admin/tags` - Create new tag
  - `PUT /api/admin/tags/:id` - Update tag
  - `DELETE /api/admin/tags/:id` - Delete tag (with usage warning)

### 3. Updated Blog Routes
- **File**: `server/routes/admin/blog.js`
- Modified to include tags in all blog post queries
- Create/Update endpoints now accept `tagIds` array
- Automatically manages tag associations

### 4. Router Configuration
- **File**: `server/routes/admin/index.js`
- Added tags router to admin routes

## Frontend Changes

### 1. API Endpoints
- **File**: `client/src/api/endpoints.js`
- Added tags endpoints for frontend API calls

### 2. AdminTags Component
- **File**: `client/src/components/AdminTags.jsx`
- **CSS**: `client/src/components/AdminTags.css`
- Full tag management interface with:
  - Grid view of all tags with post counts
  - Color picker for tag customization
  - Create, edit, and delete functionality
  - Warning when deleting tags in use

### 3. ContentEditor Updates
- **File**: `client/src/components/ContentEditor.jsx`
- **CSS**: `client/src/components/ContentEditor.css`
- Added tag selection interface:
  - Multi-select tag chips
  - Visual color coding
  - Loads existing tags when editing posts

### 4. AdminContent Updates
- **File**: `client/src/components/AdminContent.jsx`
- **CSS**: `client/src/components/AdminContent.css`
- Added "Tags" tab alongside "All Posts" and "Drafts"
- Displays tags on post cards with color coding
- Tab switching functionality

## How to Use

### 1. Run the Migration
```bash
cd server
npm run migrate create_tags
```

### 2. Create Tags
1. Go to Admin panel → Content section
2. Click the "Tags" tab
3. Click "Add Tag" button
4. Enter tag name and choose a color
5. Click "Create"

### 3. Use Tags in Blog Posts
1. Create or edit a blog post
2. In the editor, you'll see a "Tags:" section below the title
3. Click on tags to select/deselect them
4. Multiple tags can be selected
5. Save the post

### 4. View Tagged Posts
- Posts will display their tags as colored chips in the admin panel
- Tags show on both the "All Posts" and "Drafts" tabs

## Features

✅ **Full CRUD operations** for tags  
✅ **Color customization** for each tag  
✅ **Multi-select** - assign multiple tags to each post  
✅ **Visual indicators** - tags display with their colors  
✅ **Post counts** - see how many posts use each tag  
✅ **Delete warnings** - alerts if deleting a tag in use  
✅ **Automatic slug generation** from tag names  
✅ **Cascading deletes** - removing a tag removes associations  

## Database Schema

### `tags` table
```sql
id            SERIAL PRIMARY KEY
name          VARCHAR(100) NOT NULL UNIQUE
slug          VARCHAR(100) NOT NULL UNIQUE
color         VARCHAR(7) DEFAULT '#3b82f6'
created_at    TIMESTAMP DEFAULT NOW()
updated_at    TIMESTAMP DEFAULT NOW()
```

### `blog_post_tags` table
```sql
id            SERIAL PRIMARY KEY
blog_post_id  INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE
tag_id        INTEGER REFERENCES tags(id) ON DELETE CASCADE
created_at    TIMESTAMP DEFAULT NOW()
UNIQUE(blog_post_id, tag_id)
```

## Next Steps

After running the migration, you can:
1. Start creating tags for your blog categories
2. Assign tags to existing blog posts
3. Filter posts by tags (can be implemented in the public blog view)
4. Export/import tags if needed

The system is fully integrated and ready to use!
