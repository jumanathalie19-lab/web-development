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
- Path: /books/{id}
- Description: Returns details of a single book by its ID
- Success Status: 200 OK

### 3. Create Book
- Method: POST
- Path: /books
- Description: Creates a new book
- Request Body Example: { "title": "Things Fall Apart", "author": "Chinua Achebe", "year": 1958, "isbn": "978-0385667838" }
- Success Status: 201 Created

### 4. Update Book
- Method: PUT
- Path: /books/{id}
- Description: Updates an existing book completely
- Request Body Example: { "title": "Things Fall Apart", "author": "Chinua Achebe", "year": 1958, "available": true }
- Success Status: 200 OK

### 5. Delete Book
- Method: DELETE
- Path: /books/{id}
- Description: Deletes a book from the library by its ID
- Success Status: 204 No Content

### 6. List Books by Author (Query Parameter)
- Method: GET
- Path: /books?author={authorName}
- Description: Lists books filtered by author name using a query parameter
- Example Request: GET /books?author=Chinua Achebe
- Success Status: 200 OK

## Error Codes

### 400 Bad Request
- When: The request body is missing required fields or contains invalid data
- Example: POST /books with body { "year": 2020 } missing title and author
- Response Example: { "error": "Title and author are required" }

### 404 Not Found
- When: The requested book ID does not exist in the database
- Example: GET /books/9999 where ID 9999 does not exist
- Response Example: { "error": "Book not found" }