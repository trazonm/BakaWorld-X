# Mangapill API Implementation Notes

This document outlines the actual Mangapill API structure and how the frontend was updated to match it.

## Base URL
```
https://manga-scrapers.onrender.com
```

## API Response Structure

### 1. Search Manga: `GET /mangapill/search/{query}`

**Response:**
```json
{
  "status": 200,
  "results": [
    {
      "id": "manga/3069/naruto",
      "title": "Naruto",
      "subheading": "?",
      "image": "https://cdn.readdetectiveconan.com/file/mangapill/i/3069.jpg",
      "type": "manga",
      "year": "1999",
      "status": "finished"
    }
  ]
}
```

**Key Points:**
- Response is wrapped in `{ status, results }`
- Uses `image` field (not `cover`)
- `year` is a string (not numeric)
- Includes `subheading` field

### 2. Get Manga Info: `GET /mangapill/info/{id}`

**Example:** `/mangapill/info/manga/3069/naruto`

**Response:**
```json
{
  "status": 200,
  "results": {
    "image": "https://cdn.readdetectiveconan.com/file/mangapill/i/3069.jpg",
    "title": "Naruto",
    "description": "Twelve years ago...",
    "type": "manga",
    "status": "finished",
    "year": "1999",
    "genres": ["Action", "Adventure", "Comedy"],
    "chapters": [
      {
        "title": "Chapter 1",
        "id": "chapters/3069-10001000/naruto-chapter-1"
      },
      {
        "title": "Chapter 2",
        "id": "chapters/3069-10002000/naruto-chapter-2"
      }
    ]
  }
}
```

**Key Points:**
- Response is wrapped in `{ status, results }`
- Uses `description` field (not `summary`)
- Uses `image` field (not `cover`)
- Chapters only have `title` and `id` fields
- Chapter numbers must be extracted from the `title` field using regex

### 3. Get Chapter Pages: `GET /mangapill/pages/{chapterId}`

**Example:** `/mangapill/pages/chapters/3069-10001000/naruto-chapter-1`

**Response:**
```json
{
  "status": 200,
  "results": [
    "https://cdn.readdetectiveconan.com/file/mangap/3069/10001000/1.jpg",
    "https://cdn.readdetectiveconan.com/file/mangap/3069/10001000/2.jpg",
    "https://cdn.readdetectiveconan.com/file/mangap/3069/10001000/3.jpg"
  ]
}
```

**Key Points:**
- Response is wrapped in `{ status, results }`
- `results` is a simple array of image URL strings
- Page numbers are derived from array index (index + 1)

## Implementation Changes Made

### 1. Service Layer (`mangapillService.ts`)
- Updated all interfaces to match actual API structure
- Added response unwrapping for all endpoints (accessing `data.results`)
- Changed `cover` → `image` throughout
- Changed `summary` → `description`
- Removed `chapter` field from `MangapillChapter` interface
- Updated `getChapterPages()` to convert URL array to page objects

### 2. Frontend Components
- **MangaCard.svelte**: Changed `manga.cover` → `manga.image`
- **Manga Detail Page**: Changed `manga.summary` → `manga.description` and `manga.cover` → `manga.image`
- **Chapter Display**: Changed to use `chapter.title` directly instead of `chapter.chapter`

### 3. Chapter Navigation
- Implemented regex-based chapter number extraction from titles
- Pattern: `/chapter\s+(\d+(?:\.\d+)?)/i` extracts numbers like "1", "2.5", "123"
- Chapters are sorted by extracted numbers for proper navigation

## Testing
All endpoints have been tested and verified with actual responses from the API.

## Notes
- The API is hosted on Render.com and may have cold start delays
- Images are hosted on CDN (readdetectiveconan.com)
- No pagination support in current API implementation

