# Library API Design - Books Resource

Base URL: /api

## Endpoints

### 1. List Books
- Method: GET
- Path: /books
- Description: Returns a list of all books in the library
- Success Status: 200 OK

### 2. Get One Book
- Method: GET
- Path: /books/:id
- Description: Returns details of a single book by ID
- Success Status: 200 OK

### 3. Create Book
- Method: POST
- Path: /books
- Description: Creates a new book
- Request Body Example:
```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1958,
  "isbn": "978-0385667838"
}