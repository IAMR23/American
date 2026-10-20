import BookCard from './BookCard.jsx';
export default function BookGrid({ books, empty = 'No encontramos libros.' }) { return books?.length ? <div className="book-grid">{books.map((book) => <BookCard book={book} key={book._id} />)}</div> : <div className="empty">{empty}</div>; }
