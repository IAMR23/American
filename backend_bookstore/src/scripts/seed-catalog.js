import 'dotenv/config';
import mongoose from 'mongoose';
import slugify from 'slugify';
import { connectDatabase } from '../config/database.js';
import { Author, Book, Genre } from '../models/index.js';

const genres = [
  ['Ficción', 'Historias nacidas de la imaginación.'],
  ['Novela', 'Narraciones extensas con personajes y tramas desarrolladas.'],
  ['Cuento', 'Relatos breves de ficción.'],
  ['Poesía', 'Obras literarias escritas en verso o prosa poética.'],
  ['Ensayo', 'Textos de reflexión, análisis y pensamiento.'],
  ['Filosofía', 'Obras sobre las grandes preguntas del conocimiento y la existencia.'],
  ['Ciencia ficción', 'Relatos inspirados en ciencia, tecnología y futuros posibles.'],
  ['Fantasía', 'Mundos y acontecimientos con elementos extraordinarios.'],
  ['Misterio', 'Historias centradas en enigmas y secretos.'],
  ['Terror', 'Relatos diseñados para inquietar y provocar suspense.'],
  ['Romance', 'Historias donde las relaciones amorosas ocupan un lugar central.'],
  ['Aventura', 'Viajes, desafíos y acontecimientos extraordinarios.'],
  ['Historia', 'Obras relacionadas con hechos y periodos históricos.'],
  ['Biografía', 'Relatos sobre la vida de personas reales.'],
  ['Literatura clásica', 'Obras fundamentales que han perdurado a través del tiempo.'],
  ['Realismo mágico', 'Lo cotidiano convive de forma natural con lo fantástico.'],
  ['Distopía', 'Sociedades imaginarias marcadas por el control o la opresión.'],
  ['Drama', 'Conflictos humanos intensos y sus consecuencias.'],
  ['Sátira', 'Crítica social expresada mediante humor e ironía.'],
  ['Infantil', 'Historias pensadas para lectores jóvenes y familias.'],
];

const authors = [
  ['Miguel de Cervantes', 'Novelista, poeta y dramaturgo español del Siglo de Oro.'],
  ['Jane Austen', 'Novelista inglesa reconocida por su mirada irónica sobre la sociedad de su época.'],
  ['Mary Shelley', 'Escritora británica y figura esencial de la novela gótica.'],
  ['Edgar Allan Poe', 'Escritor estadounidense, maestro del cuento de misterio y terror.'],
  ['Jules Verne', 'Novelista francés y pionero de la literatura de ciencia ficción.'],
  ['H. G. Wells', 'Escritor británico conocido por sus novelas de anticipación científica.'],
  ['Franz Kafka', 'Escritor de lengua alemana cuya obra explora la alienación y el absurdo.'],
  ['Virginia Woolf', 'Novelista y ensayista británica, referente del modernismo literario.'],
  ['George Orwell', 'Escritor y periodista británico conocido por su crítica política y social.'],
  ['Gabriel García Márquez', 'Novelista colombiano y uno de los grandes exponentes del realismo mágico.'],
  ['Jorge Luis Borges', 'Escritor argentino célebre por sus cuentos, ensayos y universos laberínticos.'],
  ['Julio Cortázar', 'Escritor argentino, innovador de la narrativa latinoamericana.'],
  ['Federico García Lorca', 'Poeta y dramaturgo español de la Generación del 27.'],
  ['Rubén Darío', 'Poeta nicaragüense y figura central del modernismo en español.'],
  ['León Tolstói', 'Novelista ruso cuyas obras retratan la sociedad y los dilemas morales.'],
  ['Fiódor Dostoyevski', 'Novelista ruso centrado en la psicología, la ética y la condición humana.'],
  ['Oscar Wilde', 'Escritor irlandés reconocido por su ingenio, teatro y narrativa.'],
  ['Antoine de Saint-Exupéry', 'Escritor y aviador francés, autor de relatos humanistas.'],
  ['Herman Melville', 'Novelista estadounidense conocido por sus relatos marítimos.'],
  ['Bram Stoker', 'Novelista irlandés recordado especialmente por su ficción gótica.'],
  ['Horacio Quiroga', 'Cuentista uruguayo, referente del relato breve latinoamericano.'],
  ['Homero', 'Poeta griego a quien la tradición atribuye grandes epopeyas de la Antigüedad.'],
  ['Alexandre Dumas', 'Novelista y dramaturgo francés, maestro de la aventura histórica.'],
  ['Louisa May Alcott', 'Escritora estadounidense conocida por sus novelas de formación.'],
];

const books = [
  ['Don Quijote de la Mancha', 1605, ['Miguel de Cervantes'], ['Novela', 'Aventura', 'Literatura clásica'], 'Un hidalgo transforma su vida al decidir convertirse en caballero andante.'],
  ['Orgullo y prejuicio', 1813, ['Jane Austen'], ['Novela', 'Romance', 'Literatura clásica'], 'Elizabeth Bennet y el señor Darcy desafían sus primeras impresiones y las convenciones sociales.'],
  ['Emma', 1815, ['Jane Austen'], ['Novela', 'Romance', 'Sátira'], 'Una joven segura de su talento como casamentera descubre los límites de sus propios juicios.'],
  ['Frankenstein', 1818, ['Mary Shelley'], ['Terror', 'Ciencia ficción', 'Literatura clásica'], 'Un científico da vida a una criatura y debe afrontar las consecuencias de su ambición.'],
  ['Narraciones extraordinarias', 1845, ['Edgar Allan Poe'], ['Cuento', 'Terror', 'Misterio'], 'Una selección de relatos donde el miedo, la culpa y lo inexplicable ocupan el centro.'],
  ['El escarabajo de oro', 1843, ['Edgar Allan Poe'], ['Cuento', 'Misterio', 'Aventura'], 'Un criptograma conduce a los protagonistas tras la pista de un tesoro oculto.'],
  ['Viaje al centro de la Tierra', 1864, ['Jules Verne'], ['Aventura', 'Ciencia ficción'], 'Una expedición desciende por un volcán hacia un mundo desconocido bajo la superficie.'],
  ['La vuelta al mundo en 80 días', 1872, ['Jules Verne'], ['Aventura', 'Novela'], 'Phileas Fogg apuesta que puede circunnavegar el planeta en apenas ochenta días.'],
  ['Veinte mil leguas de viaje submarino', 1870, ['Jules Verne'], ['Aventura', 'Ciencia ficción'], 'El capitán Nemo guía un asombroso viaje submarino a bordo del Nautilus.'],
  ['La máquina del tiempo', 1895, ['H. G. Wells'], ['Ciencia ficción', 'Aventura'], 'Un inventor viaja al futuro y encuentra una humanidad dividida en especies opuestas.'],
  ['La guerra de los mundos', 1898, ['H. G. Wells'], ['Ciencia ficción', 'Aventura'], 'Una invasión marciana pone a prueba la supervivencia y la confianza de la humanidad.'],
  ['La metamorfosis', 1915, ['Franz Kafka'], ['Novela', 'Drama', 'Literatura clásica'], 'Gregor Samsa despierta transformado y su familia enfrenta una realidad incomprensible.'],
  ['El proceso', 1925, ['Franz Kafka'], ['Novela', 'Drama'], 'Un hombre es acusado por una autoridad inaccesible sin llegar a conocer su delito.'],
  ['La señora Dalloway', 1925, ['Virginia Woolf'], ['Novela', 'Drama', 'Literatura clásica'], 'Un día en Londres enlaza recuerdos, decisiones y vidas marcadas por el paso del tiempo.'],
  ['Al faro', 1927, ['Virginia Woolf'], ['Novela', 'Drama'], 'Una familia y sus invitados exploran el afecto, la pérdida y la percepción del tiempo.'],
  ['1984', 1949, ['George Orwell'], ['Distopía', 'Ciencia ficción', 'Novela'], 'Winston Smith intenta conservar su libertad interior bajo un régimen de vigilancia absoluta.'],
  ['Rebelión en la granja', 1945, ['George Orwell'], ['Sátira', 'Ficción', 'Literatura clásica'], 'Los animales de una granja derrocan a sus dueños y construyen un nuevo poder.'],
  ['Cien años de soledad', 1967, ['Gabriel García Márquez'], ['Realismo mágico', 'Novela'], 'La historia de la familia Buendía recorre generaciones de memoria, deseo y soledad.'],
  ['El amor en los tiempos del cólera', 1985, ['Gabriel García Márquez'], ['Romance', 'Novela'], 'Un amor persistente atraviesa décadas, cambios sociales y caminos separados.'],
  ['Crónica de una muerte anunciada', 1981, ['Gabriel García Márquez'], ['Novela', 'Misterio'], 'Un pueblo entero conoce un crimen inminente, pero nadie consigue impedirlo.'],
  ['Ficciones', 1944, ['Jorge Luis Borges'], ['Cuento', 'Fantasía', 'Filosofía'], 'Laberintos, bibliotecas y paradojas desafían los límites de la realidad.'],
  ['El Aleph', 1949, ['Jorge Luis Borges'], ['Cuento', 'Fantasía', 'Filosofía'], 'Relatos donde lo infinito y lo cotidiano se encuentran de maneras inesperadas.'],
  ['Rayuela', 1963, ['Julio Cortázar'], ['Novela', 'Ficción'], 'Una novela abierta que invita a recorrer el amor, el exilio y la búsqueda en distintos órdenes.'],
  ['Bestiario', 1951, ['Julio Cortázar'], ['Cuento', 'Fantasía'], 'Lo extraño irrumpe en escenas cotidianas y altera la vida de sus personajes.'],
  ['Romancero gitano', 1928, ['Federico García Lorca'], ['Poesía', 'Literatura clásica'], 'Poemas de gran fuerza simbólica inspirados en el mundo andaluz.'],
  ['Azul...', 1888, ['Rubén Darío'], ['Poesía', 'Cuento'], 'Una obra fundamental del modernismo que reúne poesía y prosa.'],
  ['Guerra y paz', 1869, ['León Tolstói'], ['Novela', 'Historia', 'Literatura clásica'], 'Varias familias rusas viven el amor, la pérdida y la guerra durante la invasión napoleónica.'],
  ['Anna Karénina', 1878, ['León Tolstói'], ['Novela', 'Romance', 'Drama'], 'Una relación apasionada confronta a una mujer con las normas de la sociedad imperial rusa.'],
  ['Crimen y castigo', 1866, ['Fiódor Dostoyevski'], ['Novela', 'Drama', 'Literatura clásica'], 'Un estudiante comete un crimen y queda atrapado entre la culpa y la justificación.'],
  ['Los hermanos Karamázov', 1880, ['Fiódor Dostoyevski'], ['Novela', 'Filosofía', 'Drama'], 'Una familia dividida enfrenta un crimen y profundas preguntas morales.'],
  ['El retrato de Dorian Gray', 1890, ['Oscar Wilde'], ['Novela', 'Fantasía', 'Drama'], 'Un joven conserva su belleza mientras un retrato carga con el deterioro de sus actos.'],
  ['El principito', 1943, ['Antoine de Saint-Exupéry'], ['Infantil', 'Fantasía', 'Filosofía'], 'Un pequeño viajero comparte encuentros que revelan el valor de la amistad y el cuidado.'],
  ['Moby Dick', 1851, ['Herman Melville'], ['Novela', 'Aventura', 'Literatura clásica'], 'El capitán Ahab persigue obsesivamente a una gran ballena blanca.'],
  ['Drácula', 1897, ['Bram Stoker'], ['Terror', 'Novela', 'Literatura clásica'], 'Un grupo de personas lucha contra un conde que extiende su amenaza desde Transilvania.'],
  ['Cuentos de amor, de locura y de muerte', 1917, ['Horacio Quiroga'], ['Cuento', 'Terror', 'Drama'], 'Relatos intensos sobre la naturaleza, la fragilidad humana y destinos extremos.'],
  ['La Odisea', -700, ['Homero'], ['Aventura', 'Literatura clásica', 'Fantasía'], 'Odiseo atraviesa mares, criaturas y tentaciones durante su largo regreso a Ítaca.'],
  ['El conde de Montecristo', 1844, ['Alexandre Dumas'], ['Aventura', 'Novela', 'Historia'], 'Un hombre injustamente encarcelado regresa con una nueva identidad y un plan de venganza.'],
  ['Los tres mosqueteros', 1844, ['Alexandre Dumas'], ['Aventura', 'Novela', 'Historia'], 'D’Artagnan se une a tres mosqueteros en una historia de lealtad e intrigas.'],
  ['Mujercitas', 1868, ['Louisa May Alcott'], ['Novela', 'Drama', 'Literatura clásica'], 'Cuatro hermanas crecen, sueñan y encuentran su camino durante años de cambio.'],
];

const slug = (value) => slugify(value, { lower: true, strict: true, locale: 'es' });

try {
  await connectDatabase();

  const authorIds = new Map();
  for (const [name, biography] of authors) {
    let author = await Author.findOne({ name }).collation({ locale: 'es', strength: 2 });
    if (!author) author = await Author.create({ name, biography, active: true });
    authorIds.set(name, author._id);
  }

  const genreIds = new Map();
  for (const [name, description] of genres) {
    const genreSlug = slug(name);
    const genre = await Genre.findOneAndUpdate(
      { slug: genreSlug },
      { $setOnInsert: { name, slug: genreSlug, description, active: true } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    genreIds.set(name, genre._id);
  }

  for (const [title, publicationYear, authorNames, genreNames, synopsis] of books) {
    await Book.findOneAndUpdate(
      { slug: slug(title) },
      { $setOnInsert: {
        title,
        slug: slug(title),
        synopsis,
        publicationYear: publicationYear < 0 ? 0 : publicationYear,
        authors: authorNames.map((name) => authorIds.get(name)),
        genres: genreNames.map((name) => genreIds.get(name)),
        status: 'published',
      } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
  }

  const [authorCount, genreCount, bookCount] = await Promise.all([
    Author.countDocuments(), Genre.countDocuments(), Book.countDocuments(),
  ]);
  console.log(`Catálogo preparado: ${authorCount} autores, ${genreCount} géneros y ${bookCount} libros.`);
} finally {
  await mongoose.disconnect();
}
