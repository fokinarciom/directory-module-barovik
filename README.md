## Шаг 1
### 1. Справочник Жанры кино 


| Колонка | Тип данных | Описание |
| :--- | :--- | :--- |
| `id` | Целое число | Уникальный идентификатор  |
| `genre_name` | Текст | Название жанра |
| `first_movie` | Дата | Дата первого фильма жанра |
| `age_limit` | Целое число | Возрастной ценз|
| `origin_country` | Текст | Страна-родина жанра|
| `death_rate_per_film` | Число с фиксированной запятой |Ср. кол-во смертей персонажей/ 1 фильм в жанре |



### 2. Справочник Фильмы


| Колонка | Тип данных | Описание |
| :--- | :--- | :--- |
| `id` | Целое число | Уникальный идентификатор |
| `title` | Текст | Оригинальное название фильма |
| `genre_id` | **Foreign Key** | Ссылка на ID из справочника жанров |
| `box_office` | Число с фиксированной запятой| Кассовые сборы в млн |
| `duration` | Целое число | Длительность фильма в минутах |
| `premiere_date` | Дата | Дата мировой премьеры |

## Шаг 2

СУБД:   SQL Server Management Studio 20 

Структура БД:

CREATE TABLE movie_genres (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    genre_name NVARCHAR(100) NOT NULL,
    first_movie DATE,
    age_limit INT,
    origin_country NVARCHAR(50),
    death_rate_per_film DECIMAL(5, 2)
);

CREATE TABLE movies (
    id INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(255) NOT NULL,
    genre_id UNIQUEIDENTIFIER NOT NULL,
    box_office DECIMAL(12, 2),
    duration INT,
    premiere_date DATE,
    CONSTRAINT FK_movies_genre FOREIGN KEY (genre_id) REFERENCES movie_genres(id)
);

Пример заполнения таблиц:

INSERT INTO movie_genres (genre_name, first_movie, age_limit, origin_country, death_rate_per_film)
VALUES 
    ('Horror', '1896-12-24', 18, 'France', 8.75),   
    ('Comedy', '1895-06-10', 0, 'France', 0.50),    
    ('Action', '1903-12-01', 12, 'USA', 12.30);

INSERT INTO movies (title, genre_id, box_office, duration, premiere_date)
VALUES
    ('The Cabinet of Dr. Caligari', (SELECT id FROM movie_genres WHERE genre_name = 'Horror'), 0.15, 74, '1920-02-26'),
    ('Some Like It Hot', (SELECT id FROM movie_genres WHERE genre_name = 'Comedy'), 25.00, 121, '1959-03-29'),
    ('Die Hard', (SELECT id FROM movie_genres WHERE genre_name = 'Action'), 140.00, 132, '1988-07-15');
