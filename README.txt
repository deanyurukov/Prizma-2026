ПРИЗМА '26 : ГРАНИЦИ · Група Б (XI – XII клас) · Нови граници

СЪДЪРЖАНИЕ НА АРХИВА

  uslovie.pdf     условието на задачата
  proveri.py      проверка на решението ви върху примерните тестове
  primeri/        примерни тестове (.in) и прагове (pragove.txt)
    primer1       примерът от условието (N = 12, K = 3)
    primer2       N = 150, K = 5
    primer3       N = 3000, K = 12 (колкото най-големите скрити тестове)
    pragove.txt   праговете П1, П2 и П3 за всеки примерен тест

КАК СЕ ПУСКА ПРОВЕРКАТА

Нужен е Python 3. Отворете терминал в папката с вашето решение и напишете
командата, с която пускате програмата си, в кавички след proveri.py:

  Python       python proveri.py "python reshenie.py"
  JavaScript   python proveri.py "node reshenie.js"
  Java         javac Main.java
               python proveri.py "java Main"
  C++          g++ -O2 -o reshenie reshenie.cpp
               python proveri.py "reshenie.exe"      (Linux и macOS: "./reshenie")
  C#           dotnet build -c Release
               python proveri.py "bin\Release\net8.0\Reshenie.exe"
               (пътят до .exe файла зависи от проекта ви)

Ако proveri.py е в друга папка, напишете пътя до него, например:
  python C:\prizma\proveri.py "python reshenie.py"

Ако командата python не работи на Windows, опитайте с py вместо python.

Проверката пуска програмата ви за всеки тест (до 10 секунди на тест),
проверява дали разделянето е валидно, брои граничните пътища C и показва
точките според праговете. При невалиден изход казва защо. Журито използва
същата проверка със скритите тестове.
