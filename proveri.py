#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ПРИЗМА '26 : ГРАНИЦИ · Група Б · „Нови граници“
Проверка на решение върху тестове.

Употреба (от папката с вашето решение):
    python proveri.py "команда за стартиране" [папка с тестове]

Примери:
    python proveri.py "python reshenie.py"
    python proveri.py "java Main"
    python proveri.py "node reshenie.js"
    python proveri.py "reshenie.exe"

Без втори аргумент се използва папката primeri до proveri.py.
Праговете П1, П2 и П3 за всеки тест са във файла pragove.txt в същата папка.
"""
# ---- общ код за пускане на програмата (вмъква се в двата proveri.py) ----
import os, sys, time, signal, subprocess

VREME = 10.0  # секунди на тест

def _ubij(p):
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(p.pid)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            os.killpg(p.pid, signal.SIGKILL)
    except Exception:
        try:
            p.kill()
        except Exception:
            pass

def pusni(komanda, vhod):
    """Пуска програмата с даден вход. Връща (статус, изход, грешки, време)."""
    kw = dict(stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    if os.name == "nt":
        kw["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kw["start_new_session"] = True
    nachalo = time.perf_counter()
    try:
        p = subprocess.Popen(komanda, **kw)
    except Exception as e:
        return "грешка", "", str(e), 0.0
    try:
        out, err = p.communicate(vhod.encode("utf-8"), timeout=VREME)
    except subprocess.TimeoutExpired:
        _ubij(p)
        try:
            p.communicate(timeout=2)
        except Exception:
            pass
        return "време", "", "", time.perf_counter() - nachalo
    vreme = time.perf_counter() - nachalo
    out = out.decode("utf-8", "replace")
    err = err.decode("utf-8", "replace")
    if p.returncode != 0:
        return "грешка", out, err, vreme
    return "ок", out, err, vreme

def chislo(x):
    s = ("%.2f" % x).rstrip("0").rstrip(".") if isinstance(x, float) else str(x)
    return s.replace(".", ",")

def sekundi(x):
    return ("%.2f" % x).replace(".", ",")

def podgotvi_konzolata():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(errors="replace")
        except Exception:
            pass

def testove(papka):
    imena = [f[:-3] for f in os.listdir(papka) if f.endswith(".in")]
    def kluch(ime):
        cifri = "".join(ch for ch in ime if ch.isdigit())
        return (int(cifri) if cifri else 0, ime)
    return sorted(imena, key=kluch)

def argumenti(opisanie):
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "/?"):
        print(opisanie)
        sys.exit(1)
    komanda = sys.argv[1]
    papka = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "primeri")
    if not os.path.isdir(papka):
        print("Не намирам папката с тестове: " + papka)
        sys.exit(1)
    return komanda, papka

def pokazhi_greshka(status, err, vreme):
    if status == "време":
        return "превишено време (над %s с)" % chislo(VREME)
    red = ""
    for l in err.strip().splitlines()[-3:]:
        red += "\n      " + l[:150]
    return "програмата завърши с грешка" + red
# ---- край на общия код ----

def procheti_vhod(tekst):
    d = list(map(int, tekst.split()))
    N, M, K, T = d[0:4]
    i = 4
    P = []
    for _ in range(N):
        P.append(d[i + 2])
        i += 3
    E = []
    for _ in range(M):
        E.append((d[i] - 1, d[i + 1] - 1))
        i += 2
    return N, K, T, P, E

def granici(S, K, T):
    dolna = -((-(100 - T) * S) // (100 * K))   # закръгляне нагоре
    gorna = ((100 + T) * S) // (100 * K)
    return dolna, gorna

def ocenka(N, K, T, P, E, izhod):
    """Връща (валидно, C, съобщение)."""
    tokeni = izhod.split()
    if len(tokeni) != N:
        return False, None, "очаквах %d числа, получих %d" % (N, len(tokeni))
    lab = []
    for t in tokeni:
        try:
            x = int(t)
        except ValueError:
            return False, None, "„%s“ не е цяло число" % t[:20]
        if not 1 <= x <= K:
            return False, None, "номер на област %d е извън границите 1..%d" % (x, K)
        lab.append(x)
    sased = [[] for _ in range(N)]
    for a, b in E:
        sased[a].append(b)
        sased[b].append(a)
    S = sum(P)
    dolna, gorna = granici(S, K, T)
    naselenie = [0] * (K + 1)
    chlenove = [[] for _ in range(K + 1)]
    for i, l in enumerate(lab):
        naselenie[l] += P[i]
        chlenove[l].append(i)
    for k in range(1, K + 1):
        if not chlenove[k]:
            return False, None, "област %d е празна" % k
    for k in range(1, K + 1):
        if not dolna <= naselenie[k] <= gorna:
            return False, None, "област %d има %d жители (допустимо %d–%d)" % (k, naselenie[k], dolna, gorna)
    for k in range(1, K + 1):
        start = chlenove[k][0]
        vidyani = {start}
        stek = [start]
        while stek:
            u = stek.pop()
            for v in sased[u]:
                if lab[v] == k and v not in vidyani:
                    vidyani.add(v)
                    stek.append(v)
        if len(vidyani) != len(chlenove[k]):
            return False, None, "област %d не е свързана (селищата ѝ са в повече от една част)" % k
    C = sum(1 for a, b in E if lab[a] != lab[b])
    return True, C, ""

def procheti_pragove(papka):
    pr = {}
    pat = os.path.join(papka, "pragove.txt")
    if os.path.exists(pat):
        for red in open(pat, encoding="utf-8"):
            ch = red.split()
            if len(ch) == 4:
                pr[ch[0]] = tuple(int(x) for x in ch[1:])
    return pr

def main():
    podgotvi_konzolata()
    komanda, papka = argumenti(__doc__)
    imena = testove(papka)
    if not imena:
        print("В папката " + papka + " няма тестове (.in).")
        return
    pragove = procheti_pragove(papka)
    print("Проверка на „%s“ върху %d теста от %s\n" % (komanda, len(imena), papka))
    obshto = 0
    for ime in imena:
        vhod = open(os.path.join(papka, ime + ".in"), encoding="utf-8").read()
        N, K, T, P, E = procheti_vhod(vhod)
        status, izhod, err, vreme = pusni(komanda, vhod)
        if status != "ок":
            print("%-10s 0 / 5 т.  %s" % (ime, pokazhi_greshka(status, err, vreme)))
            continue
        validno, C, sab = ocenka(N, K, T, P, E, izhod)
        if not validno:
            print("%-10s 0 / 5 т.  невалидно: %s   (%s с)" % (ime, sab, sekundi(vreme)))
            continue
        if ime in pragove:
            p1, p2, p3 = pragove[ime]
            t = 2 + (C <= p1) + (C <= p2) + (C <= p3)
            obshto += t
            print("%-10s %d / 5 т.  валидно, C = %d   (П1 = %d, П2 = %d, П3 = %d)   (%s с)"
                  % (ime, t, C, p1, p2, p3, sekundi(vreme)))
        else:
            obshto += 2
            print("%-10s 2 / 5 т.  валидно, C = %d   (няма прагове за този тест)   (%s с)" % (ime, C, sekundi(vreme)))
    print("\nОбщо: %d от %d т." % (obshto, 5 * len(imena)))
    print("Валидно разделяне носи 2 т., а всеки праг, който C не надвишава, носи още 1 т.")

if __name__ == "__main__":
    main()
