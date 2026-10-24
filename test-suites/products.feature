# language: uk
@ui @slow
Функціонал: Пошук товарів
  Пошук на сторінці товарів знаходить товари за частиною назви

  Передумова:
    Дано user opens the products page

  Структура сценарію: Знайти "<product>" за запитом "<query>"
    Коли user searches for "<query>"
    Тоді search results include "<product>"

    Приклади:
      | query | product       |
      | Top   | Blue Top      |
      | Dress | Stylish Dress |
