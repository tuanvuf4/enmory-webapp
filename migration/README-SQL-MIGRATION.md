# SQL to Firebase Migration Script

This script migrates items, meanings, and examples from a SQL file to Firebase Firestore following the IItem, IMeaning, and IExample interface structures with proper relationships.

## Prerequisites

1. **SQL File**: Your SQL file should contain INSERT statements for item, meaning, example, and meaning_examples_example tables
2. **Firebase Service Account**: Ensure `serviceAccountKey.json` is in the migration folder
3. **Node.js**: Version 16.0.0 or higher

## What This Script Does

The migration script creates **three separate Firebase collections**:

1. **`examples`** - All examples stored independently
2. **`items`** - All items with embedded meanings
3. Each item's meanings contain **example IDs** (string array) that reference the examples collection

### Data Structure

```
items/
  └─ item_doc_id/
      ├─ origin: "hello"
      ├─ uid: "xK0dvMHrcnMIKxIryzTkBjybdgW2"
      ├─ catId: 1
      ├─ level: 5
      └─ meanings: [
          {
            typeId: 1,
            definition: "a greeting",
            translation: "xin chào",
            examples: ["example_id_1", "example_id_2"]  // References to examples collection
          }
        ]

examples/
  └─ example_doc_id/
      ├─ origin: "Hello, how are you?"
      ├─ translation: "Xin chào, bạn khỏe không?"
      ├─ note: ""
      └─ uid: "xK0dvMHrcnMIKxIryzTkBjybdgW2"
```

## SQL File Format

The script expects SQL INSERT statements for multiple tables:

```sql
-- Items table
INSERT INTO `item` (id, original, catId, level, favorite, forms, collocations, created_date, last_update, userId)
VALUES (1, 'hello', 1, 5, 1, 'hello,hellos', 'say hello', 1642534800000, 1642534800000, 1);

-- Meanings table
INSERT INTO `meaning` (id, definition, translation, typeId, itemId, synonyms, antonyms, common, enable)
VALUES (1, 'a greeting', 'lời chào', 1, 1, 'hi,hey', '', 1, 1);

-- Examples table
INSERT INTO `example` (id, original, translation, note, created_date, last_update)
VALUES (1, 'Hello, how are you?', 'Xin chào, bạn khỏe không?', '', 1642534800000, 1642534800000);

-- Meaning-Example relationships
INSERT INTO `meaning_examples_example` (meaningId, exampleId) VALUES (1, 1);
```

## Field Mapping

The script automatically maps SQL field names to their respective Firebase interface properties:

### Item Table → IItem Properties

| SQL Field (item table) | IItem Property | Type     | Notes                                            |
| ---------------------- | -------------- | -------- | ------------------------------------------------ |
| `original`             | `origin`       | string   | Required - the main item text                    |
| `catId`                | `catId`        | number   | Category (0=ALL, 1=WORD, 2=PHRASE, etc.)         |
| `level`                | `level`        | number   | Difficulty level                                 |
| `favorite`             | `favorite`     | boolean  | Favorite status                                  |
| `archive`              | `archive`      | boolean  | Archive status                                   |
| `is_deleted`           | `is_deleted`   | boolean  | Deletion status                                  |
| `forms`                | `forms`        | string[] | Word forms (comma-separated)                     |
| `collocations`         | `collocations` | string[] | Collocations (comma-separated)                   |
| `word_family`          | `word_family`  | string[] | Word family (comma-separated)                    |
| `relation`             | `relation`     | string[] | Relations (comma-separated)                      |
| `created_date`         | `created_date` | number   | Creation timestamp                               |
| `last_update`          | `last_update`  | number   | Last update timestamp                            |
| `deleted_date`         | `deleted_date` | number   | Deletion timestamp (if deleted)                  |
| `userId`               | `uid`          | string   | User ID (forced to xK0dvMHrcnMIKxIryzTkBjybdgW2) |

### Meaning Table → IMeaning Properties

| SQL Field (meaning table) | IMeaning Property | Type     | Notes                            |
| ------------------------- | ----------------- | -------- | -------------------------------- |
| `definition`              | `definition`      | string   | Definition of the meaning        |
| `translation`             | `translation`     | string   | Translation                      |
| `typeId`                  | `typeId`          | number   | Type (1=NOUN, 2=VERB, etc.)      |
| `common`                  | `common`          | boolean  | Is common meaning                |
| `enable`                  | `enable`          | boolean  | Is enabled                       |
| `note`                    | `note`            | string   | Additional notes                 |
| `grammar`                 | `grammar`         | string   | Grammar notes                    |
| `collocations`            | `collocations`    | string   | Collocation text                 |
| `synonyms`                | `synonyms`        | string[] | Synonyms (comma-separated)       |
| `antonyms`                | `antonyms`        | string[] | Antonyms (comma-separated)       |
| `created_date`            | `created_date`    | number   | Creation timestamp               |
| `last_update`             | `last_update`     | number   | Last update timestamp            |
| -                         | `examples`        | string[] | Firebase example IDs (from join) |

### Example Table → IExample Properties

| SQL Field (example table) | IExample Property | Type   | Notes                 |
| ------------------------- | ----------------- | ------ | --------------------- |
| `original`                | `origin`          | string | Original example text |
| `translation`             | `translation`     | string | Translation           |
| `note`                    | `note`            | string | Additional notes      |
| `created_date`            | `created_date`    | number | Creation timestamp    |
| `last_update`             | `last_update`     | number | Last update timestamp |

### Category IDs

- `0` = ALL
- `1` = WORD
- `2` = PHRASE
- `3` = IDIOM
- `4` = SLANG
- `5` = COLLOCATION
- `6` = SENTENCE

### Type IDs (for meanings)

- `0` = ALL
- `1` = NOUN
- `2` = VERB
- `3` = ADJECTIVE
- `4` = ADVERB
- `5` = PREPOSITION
- `6` = CONJUNCTION
- `7` = PRONOUN
- `8` = ARTICLE
- `9` = DETERMINER
- `10` = INTERJECTION

## Usage

### Basic Usage

Place your SQL file in the migration folder and run:

```bash
cd migration
node migrate-items-with-meanings.js
```

The script will use the default SQL file: `enmory_webapp_11132025.sql`

### Specify Custom SQL File Path

```bash
node migrate-items-with-meanings.js /path/to/your/file.sql
```

### Specify User ID (Optional)

By default, all items are assigned to user ID `xK0dvMHrcnMIKxIryzTkBjybdgW2`. To override:

```bash
node migrate-items-with-meanings.js enmory_webapp_11132025.sql YOUR_USER_ID_HERE
```

## Migration Process

The script performs the following steps:

1. **Parse SQL File** - Extracts data from item, meaning, example, and meaning_examples_example tables
2. **Insert Examples** - Creates all examples in the `examples` collection first and maps SQL IDs to Firebase IDs
3. **Build Relationships** - Creates lookup maps for item→meanings and meaning→examples
4. **Map Data** - Transforms SQL records to IItem and IMeaning interfaces
5. **Insert Items** - Creates all items with embedded meanings in the `items` collection
6. **Display Summary** - Shows success/failure statistics

## Script Features

1. **Three Collections**: Creates separate `examples` and `items` collections
2. **Proper Relationships**: Meanings contain example ID references, not embedded objects
3. **Batch Processing**: Processes items in batches of 500 to avoid Firebase limits
4. **Error Handling**: Continues processing even if individual items fail
5. **Multiple Table Join**: Automatically joins item, meaning, example, and relationship tables
6. **Type Conversion**: Converts SQL types (NULL, TRUE, FALSE, numbers, strings)
7. **Array Parsing**: Handles comma-separated string fields
8. **Auto-Generated IDs**: Creates Firebase document IDs automatically
9. **Progress Tracking**: Shows real-time progress with detailed step-by-step output

## Output Example

```
==================================================
Items Migration Script with Meanings & Examples
==================================================
SQL File: ./enmory_webapp_11132025.sql
Collection: items
User ID: xK0dvMHrcnMIKxIryzTkBjybdgW2
==================================================

[1/6] Parsing SQL file...
  Reading SQL file...
  Parsing items table...
  Parsing meanings table...
  Parsing examples table...
  Parsing meaning-example relationships...
✓ Parsed 2000 items
✓ Parsed 3500 meanings
✓ Parsed 5000 examples
✓ Parsed 8000 meaning-example relationships

[2/6] Inserting examples into Firebase...

Inserting 5000 examples into Firebase...
  Batch 1 (500 examples)...
  Batch 2 (500 examples)...
  ...
✓ Inserted 5000 examples
✓ Created 5000 examples

[3/6] Building relationship maps...
✓ Built lookup maps

[4/6] Mapping records to IItem interface...
✓ Mapped 2000 items with meanings

[5/6] First item preview:
{
  "origin": "hello",
  "uid": "xK0dvMHrcnMIKxIryzTkBjybdgW2",
  "catId": 1,
  "level": 5,
  "meanings": [
    {
      "typeId": 1,
      "definition": "a greeting",
      "translation": "lời chào",
      "examples": ["firebase_example_id_1", "firebase_example_id_2"]
    }
  ]
}

[6/6] Inserting items into Firebase...

Starting migration of 2000 items...

Processing batch 1 (500 items)...
✓ Batch 1 committed successfully
...

==================================================
Migration Summary:
==================================================
Total items processed: 2000
✓ Successfully migrated: 2000
✗ Failed: 0

✓ Migration completed!
```

## Important Notes

### User ID Assignment

All items and examples are automatically assigned to user ID: `xK0dvMHrcnMIKxIryzTkBjybdgW2`

This can be overridden by passing a user ID as the second argument.

### Data Structure

- **Examples are stored separately** in the `examples` collection
- **Items contain embedded meanings** in the `items` collection
- **Meanings reference examples by ID** through the `examples` string array field
- This structure allows:
  - Examples to be reused across multiple meanings
  - Efficient querying of examples
  - Proper data normalization

### Collections Created

1. **examples** - All example documents
2. **items** - All item documents with embedded meanings array

## Troubleshooting

### "Cannot find module 'firebase-admin'"

Install dependencies:

```bash
cd migration
npm install
```

### "ENOENT: no such file or directory"

Make sure your SQL file path is correct and the file exists in the migration folder.

### "Insufficient permissions"

Check that your `serviceAccountKey.json` has the correct Firestore permissions for both collections.

### No meanings added to items

- Verify that the `meaning` table has records with matching `itemId`
- Check that the join table `meaning_examples_example` has relationships
- Review the console output for parsing statistics

### Examples not linked to meanings

- Ensure `meaning_examples_example` table has proper relationships
- Check that `meaningId` and `exampleId` match records in their respective tables

## Best Practices

- **Backup First**: Always backup your Firestore data before running migrations
- **Test Small**: Test with a subset of data first
- **Check Preview**: Review the first item preview to ensure correct structure
- **Monitor Output**: Watch the console for any errors or warnings
- **Verify Results**: Check Firebase Console after migration to verify data structure

## Data Validation

After migration, verify:

1. Items have the correct `meanings` array structure
2. Each meaning has an `examples` array of string IDs
3. Example IDs in meanings match documents in the `examples` collection
4. All user IDs are set correctly
5. Timestamps are properly converted

## Support

For issues or questions:

1. Check SQL file format matches the expected structure
2. Verify all four tables (item, meaning, example, meaning_examples_example) are present
3. Ensure Firebase service account has proper permissions
4. Confirm Node.js version is 16.0.0 or higher
5. Review console output for specific error messages
