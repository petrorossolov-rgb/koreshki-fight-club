# Research: "The Корешки Fight Club"

> Браузерный 2D файтинг на Phaser 3 для компании из 17 друзей

---

## Step 1: Understanding the Problem

**Суть:** Шуточный браузерный файтинг 1v1, где каждый из 17 друзей — уникальный персонаж с характером, статами и суперударом. Стиль MK/Tekken, pixel art, бюджет 0₽.

**Core problem:** Создать fun-to-play файтинг с достаточной глубиной (комбо, спецудары, блок), чтобы друзья рубились друг с другом и обсуждали это в чате.

**Целевая аудитория:** 17 человек в Telegram-группе "Корешки". Казуальные игроки, не файтинг-комьюнити.

**Ключевые функциональные требования:**
1. Боевая система: удары, блок, прыжки, комбо, спецудары
2. 17 уникальных персонажей с разными статами и абилками
3. Кастомизация спрайтов: размер модельки (выше/ниже/толще/тоньше), одежда, аксессуары
4. Экран выбора персонажа
5. HP бар, таймер раунда, система раундов (best of 3)
6. **Онлайн-мультиплеер (must-have)** — закладываем сетевую архитектуру с фазы 1
7. **Мобильное управление** — виртуальный джойстик + кнопки атак для телефона
8. Локальная игра как fallback (2 игрока на одной клавиатуре)

---

## Step 2: Market & Existing Solutions

### Open-source файтинги на JS/Phaser

| Проект | Стек | Stars | Статус | Что полезного |
|--------|------|-------|--------|---------------|
| [sf3js-old](https://github.com/samurai-js/sf3js-old) | Phaser 3 | 24 | 2023 | Config-driven персонажи, структура проекта |
| [StreetPhyter](https://github.com/mkhandotnet/StreetPhyter) | Phaser 3 | 16 | 2020 | Directional input, хадоукен |
| [shadow-fight](https://github.com/dowinterfor6/shadow-fight) | Canvas + Redux | 9 | — | Redux-like state для боя |
| [street-fighter](https://github.com/Max-im/street-fighter) | TS + Canvas | — | 2024 | [Играбельное демо](https://max-im.github.io/street-fighter), чистый TS |

**Вывод:** Полноценного, поддерживаемого open-source файтинга на Phaser 3 нет. Лучший референс — `sf3js-old` (config-driven подход) и `street-fighter` (TS, играбельное демо). Придётся строить с нуля, но паттерны документированы хорошо.

### Полезные референсы вне JS
- [Castagne Engine](https://castagneengine.com/) — data-driven файтинг-движок (Godot), отличная документация по архитектуре
- [Andrea Jens "I Wanna Make a Fighting Game"](https://andrea-jens.medium.com/) — серия статей, части 3-4 про state machine и hitbox/hurtbox

---

## Step 3: Technology Stack

### Подтверждённый стек

| Слой | Выбор | Почему | Trade-off | Альтернатива |
|------|-------|--------|-----------|-------------|
| **Runtime** | Browser (Web) | Мгновенный доступ по ссылке, 0 установки | Нет доступа к геймпадам без Gamepad API | Electron (оффлайн) |
| **Engine** | Phaser 3.90 | Зрелый, огромная экосистема, Arcade Physics, TypeScript | Тяжелее чем raw Canvas; нет встроенного netcode | KAPLAY.js (проще), raw Canvas (легче) |
| **Language** | TypeScript | Type safety, IDE support, рефакторинг 17 персонажей | Больше boilerplate | JavaScript |
| **Bundler** | Vite 6 | HMR, быстрая сборка, офиц. шаблон Phaser | — | Webpack (медленнее) |
| **Sprites** | Pixel Art (LuizMelo packs) | CC0 лицензия, 8-13 анимаций, бесплатно | Все персонажи похожи стилистически → различаем через scale, palette swap, аксессуары | Заказ у художника ($$$) |
| **Touch controls** | Виртуальный джойстик + кнопки | Основная платформа — телефон через браузер | Неудобнее физических кнопок | nipplejs (библиотека виртуального джойстика) |
| **Hosting (client)** | GitHub Pages | Бесплатно, 100 GB/мес bandwidth, CI/CD через Actions | 1 GB лимит, без SSR | Cloudflare Pages (безлимит bandwidth) |
| **Hosting (server)** | Deno Deploy | Бесплатно (100K req/день), TS нативно, WebSocket, без кредитки | Colyseus не запустится, свой game-server | Render free (cold start 30s) |

### Важные уточнения по хостингу

**Fly.io больше не имеет бесплатного tier** (убран в 2024). Trial: 2 часа или 7 дней. **Не подходит.**

**Рекомендация для сервера (фаза 4):**
- **Вариант A (проще):** Render free tier + Colyseus. Cold start ~30 сек при idle, но Colyseus даёт rooms + matchmaking из коробки.
- **Вариант B (надёжнее):** Deno Deploy + свой минимальный game-server на TS. Нет cold start, 100K req/день бесплатно. Но matchmaking/rooms писать самим.
- **Вариант C (производительнее):** Cloudflare Workers + Durable Objects. Каждая комната = Durable Object. Нет cold start, бесплатно 100K req/день. Но другая модель программирования.

### Библиотеки

| Назначение | Библиотека | Зачем |
|-----------|-----------|-------|
| Physics | Phaser Arcade Physics | Pushboxes, гравитация, платформы |
| Hitbox/Hurtbox | Ручная AABB | Frame-precise, без физических побочных эффектов |
| Input buffer | Самописный circular buffer | ~60 фреймов, motion input detection |
| Touch controls | nipplejs + custom buttons | Виртуальный джойстик для мобильных браузеров |
| Dev tools | lil-gui | Tweaking параметров в реальном времени |
| Online | native WebSocket (Deno) | Минимальный overhead для input sync |

---

## Step 4: Architecture Overview

### High-level архитектура (online-first)

```
┌────────────────────────────────────────────────────┐
│               BROWSER CLIENT (mobile-first)         │
│                                                     │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │   Scenes   │  │   Input    │  │   Renderer   │ │
│  │  (Phaser)  │  │  Manager   │  │   (Phaser)   │ │
│  │            │  │ ┌────────┐ │  │              │ │
│  │            │  │ │Keyboard│ │  │              │ │
│  │            │  │ │Touch   │ │  │              │ │
│  │            │  │ │Gamepad │ │  │              │ │
│  │            │  │ └────────┘ │  │              │ │
│  └────┬──────┘  └─────┬──────┘  └──────┬──────┘ │
│       │               │                 │         │
│  ┌────▼───────────────▼─────────────────▼──────┐ │
│  │              FIGHT ENGINE (shared)           │ │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │ │
│  │  │ Fighter │ │ Combo    │ │  Collision   │ │ │
│  │  │  FSM    │ │ System   │ │  (AABB)      │ │ │
│  │  └─────────┘ └──────────┘ └──────────────┘ │ │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │ │
│  │  │ Round   │ │ Damage   │ │  Animation   │ │ │
│  │  │ Manager │ │ Calc     │ │  Controller  │ │ │
│  │  └─────────┘ └──────────┘ └──────────────┘ │ │
│  └─────────────────┬───────────────────────────┘ │
│                    │                              │
│  ┌─────────────────▼────────────────────────┐    │
│  │       CHARACTER DATA (JSON)               │    │
│  │  stats, moves, hitboxes, animations,      │    │
│  │  scale, accessories, palette              │    │
│  └───────────────────────────────────────────┘    │
│                    │                              │
│  ┌─────────────────▼────────────────────────┐    │
│  │       NETWORK ADAPTER                     │    │
│  │  WebSocket client, input serialization,   │    │
│  │  state reconciliation                     │    │
│  └───────────────────────────────────────────┘    │
└──────────────────────┬─────────────────────────────┘
                       │ WebSocket
┌──────────────────────▼─────────────────────────────┐
│          GAME SERVER (Deno Deploy)                  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Rooms   │  │  Fight   │  │   Matchmaking    │ │
│  │ Manager  │  │  Engine  │  │   (lobby/invite) │ │
│  │          │  │ (shared) │  │                   │ │
│  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Ключевое решение:** Fight Engine — общий код между клиентом и сервером. Сервер — авторитарный (считает бой), клиент — предиктивный (показывает анимации). Это делает читерство невозможным и упрощает синхронизацию.

### Мобильное управление (touch controls)

```
┌─────────────────────────────────────────────────┐
│                MOBILE SCREEN                     │
│                                                  │
│         ┌──────────────────────┐                │
│         │     FIGHT ARENA      │                │
│         │                      │                │
│         │   P1 ←→ P2          │                │
│         │                      │                │
│         └──────────────────────┘                │
│                                                  │
│  ┌─────────┐              ┌──────┐ ┌──────┐    │
│  │ Virtual │              │  A   │ │  B   │    │
│  │Joystick │              │(kick)│ │(punch│    │
│  │  (move) │              └──────┘ └──────┘    │
│  │         │        ┌──────┐ ┌──────┐          │
│  └─────────┘        │Block │ │Special│          │
│                     └──────┘ └──────┘          │
└─────────────────────────────────────────────────┘
```

- Виртуальный джойстик слева (nipplejs) → 8 направлений + прыжок вверх
- Кнопки атак справа → большие, удобные для пальцев
- Адаптивная вёрстка: на десктопе UI скрывается, работает клавиатура

### Phaser Scenes

1. **BootScene** — загрузка ассетов, прелоадер
2. **MainMenuScene** — главное меню
3. **CharacterSelectScene** — выбор персонажей (сетка 17 бойцов)
4. **FightScene** — основной бой
5. **VictoryScene** — экран победы

### Fighter State Machine (иерархический FSM)

```
Top Level: Grounded | Airborne | HitStun | Knockdown | BlockStun

Grounded:
  ├── Idle
  ├── Walk (Forward/Backward)
  ├── Crouch
  ├── Attack (parameterized by move data)
  ├── Block (Standing/Crouching)
  └── Special (parameterized by move data)

Airborne:
  ├── Jump (Rising/Falling)
  ├── AirAttack
  └── AirBlock

HitStun:
  ├── StandingHit
  └── CrouchingHit

Knockdown:
  ├── Falling
  ├── Grounded
  └── GetUp
```

Каждое состояние хранит: разрешённые переходы, текущую анимацию, frame counter. Атаки — одно состояние, параметризованное данными из JSON (damage, startup/active/recovery frames, hitbox positions).

### Data Flow

1. **Input** → InputManager записывает в circular buffer (60 фреймов)
2. **Combo System** читает buffer, детектирует motion inputs и комбо
3. **Fighter FSM** получает распознанную команду, переключает состояние
4. **Collision System** каждый фрейм проверяет hitbox vs hurtbox (AABB)
5. **Damage Calc** при попадании: урон × модификатор, hitstun, knockback
6. **Animation Controller** синхронизирует спрайт с состоянием FSM
7. **Round Manager** отслеживает HP, таймер, переход между раундами

### Fixed Timestep

Вся игровая логика в `fixedUpdate()` с шагом 16.67ms (60 FPS). Независимо от реального FPS монитора. Accumulator pattern:

```typescript
const FIXED_DT = 1000 / 60;
let accumulator = 0;

update(time: number, delta: number) {
  accumulator += delta;
  while (accumulator >= FIXED_DT) {
    this.fixedUpdate(FIXED_DT);
    accumulator -= FIXED_DT;
  }
  this.interpolateRender(accumulator / FIXED_DT);
}
```

### Data-driven Character JSON

```jsonc
{
  "id": "petro",
  "name": "Петро",
  "nickname": "Long Guy",
  "tagline": "Высокий волейболист",
  "stats": {
    "health": 800,    // шкала 1-10 → маппится в реальные значения
    "speed": 500,
    "power": 0.7,
    "defense": 0.8
  },
  // Кастомизация визуала
  "visual": {
    "baseSpriteSheet": "assets/fighters/base_martial.png",
    "scale": { "x": 0.9, "y": 1.3 },       // тоньше и выше
    "palette": { "primary": "#2244AA", "secondary": "#FFFFFF" },
    "accessories": ["sports_headband", "volleyball_shoes"],
    "hairStyle": "dark_short"
  },
  "frameSize": { "w": 200, "h": 200 },
  "animations": {
    "idle": { "frames": [0,1,2,3], "frameRate": 8, "repeat": -1 },
    "walk": { "frames": [4,5,6,7,8,9], "frameRate": 10, "repeat": -1 },
    "jump": { "frames": [10,11], "frameRate": 8, "repeat": 0 },
    "attack1": { "frames": [16,17,18,19], "frameRate": 15, "repeat": 0 },
    "special1": { "frames": [24,25,26,27,28], "frameRate": 12, "repeat": 0 }
  },
  "moves": {
    "punch": {
      "input": "A",
      "damage": 80,
      "startup": 4,
      "active": 3,
      "recovery": 8,
      "onHit": 5,
      "onBlock": -2,
      "hitstun": 12,
      "blockstun": 8,
      "knockback": { "x": 100, "y": 0 },
      "hitboxes": [
        { "frame": 4, "x": 30, "y": -10, "w": 60, "h": 30 }
      ],
      "cancelInto": ["kick", "special1"],
      "cancelWindow": { "start": 6, "end": 10 },
      "animation": "attack1"
    },
    "super": {
      "input": "236236+AB",
      "damage": 350,
      "startup": 8,
      "active": 6,
      "recovery": 24,
      "cost": 100,
      "hitboxes": [
        { "frame": 8, "x": 20, "y": -20, "w": 120, "h": 60 }
      ],
      "cancelInto": [],
      "animation": "special1"
    }
  },
  "hurtboxes": {
    "standing": { "x": -15, "y": -80, "w": 30, "h": 80 },
    "crouching": { "x": -15, "y": -50, "w": 30, "h": 50 },
    "airborne": { "x": -15, "y": -70, "w": 30, "h": 70 }
  }
}
```

---

## Step 5: Risks, Assumptions & Complexity

### Оценки

| Параметр | Оценка | Комментарий |
|----------|--------|-------------|
| **Technical complexity** | **Medium-High** | FSM + hitbox + онлайн с фазы 1 + touch controls = 4 нетривиальных системы |
| **Time to MVP** | **Medium** | Фаза 1 (один персонаж, бой + онлайн + touch) — 3-5 недель. Все 17 персонажей — ещё 2-3 недели |
| **Maintenance burden** | **Low** | Data-driven подход: добавление/балансировка персонажей = правка JSON |
| **Key risks** | См. ниже | |

### Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| Файтинг не "feels right" (плохой game feel) | Высокая | Критичный | Итеративный тюнинг frame data, playtesting с друзьями с фазы 1 |
| Спрайты выглядят одинаково для всех 17 | Средняя | Средний | Palette swap + кастомные элементы (шапки, аксессуары) |
| Онлайн-мультиплеер сложнее ожидаемого | Высокая | Средний | Delay-based netcode (не rollback), авторитарный сервер |
| Бесплатные хостинги меняют условия | Средняя | Низкий | Архитектура не привязана к конкретному хостеру |
| Скука — друзья наиграются за вечер | Средняя | Средний | Уникальные персонажи, инсайд-юмор, обновления |

### Допущения

| Допущение | Что сломается если неверно |
|-----------|--------------------------|
| Максимум 17 игроков, ~8 одновременных матчей | Нужен более мощный сервер |
| Все играют из дома (пинг <100ms) | Delay-based netcode станет ощутимым |
| Один разработчик | Нет code review, все решения единоличные |
| Основная платформа — мобильный браузер | Нужны touch controls с фазы 1 |
| CC0 спрайты LuizMelo подходят стилистически | Рисовать самим или искать другие паки |

---

## Step 6: Foundational Principles

> **1. Game Feel First**: Каждый кадр анимации, каждый хитбокс тестируется на "ощущения". Техническое совершенство без fun — провал.
> *Rationale:* Это шуточная игра для друзей. Если драться неприятно, никто не будет играть дважды.

> **2. Data-Driven Everything**: Персонажи, удары, анимации — JSON-конфиги. Код не знает про "Васю" или "Петю".
> *Rationale:* 17 уникальных бойцов. Hardcoded подход = кошмар балансировки и поддержки.

> **3. Incremental Delivery**: Каждая фаза — играбельный билд. Фаза 1 уже должна быть весёлой.
> *Rationale:* Бюджет 0₽, один разработчик. Если бросить на полпути — уже есть играбельная версия.

> **4. Fixed Timestep Simulation**: Вся игровая логика работает на 60 FPS фиксировано, независимо от рендера.
> *Rationale:* Файтинги — frame-precise жанр. Переменный timestep ломает комбо-тайминги и hitstun.

> **5. Keep Netcode Simple**: Delay-based авторитарный сервер, не rollback. Для 17 друзей с <100ms пинга этого достаточно.
> *Rationale:* Rollback netcode в JS — незрелые библиотеки, огромная сложность реализации. Overkill для casual-игры.

> **6. Humor-Driven Design**: Инсайд-шутки, мемные суперудары, абсурдные описания — всё это важнее технического совершенства.
> *Rationale:* Весь проект существует ради смеха в чате "Корешки". Персонаж "Петро" должен вызывать угар, а не "wow nice hitbox".

> **7. Mobile-First, Desktop-Compatible**: UI и управление проектируются сначала для телефона, потом адаптируются под клавиатуру.
> *Rationale:* 17 друзей скорее всего откроют ссылку из Telegram на телефоне. Если на телефоне неудобно — не будут играть.

---

## Step 7: Recommended Next Steps

### MVP (Фаза 1): Ядро + базовый онлайн

**Scope:**
- 1 персонаж (зеркальный матч)
- Базовые действия: idle, walk, jump, crouch, 2 удара, блок
- Hitbox/hurtbox коллизии (AABB)
- HP бар, таймер раунда, best of 3
- **Touch controls** (виртуальный джойстик + кнопки) — mobile-first
- Клавиатура как альтернатива (WASD+QE vs Arrows+JK)
- Fixed timestep game loop (60 FPS)
- **Базовый онлайн**: WebSocket подключение, комната на двоих, input sync
- Деплой: GitHub Pages (клиент) + Deno Deploy (сервер)

**Шаблон проекта:**
```bash
git clone https://github.com/phaserjs/template-vite-ts.git koreshki-fight-club
cd koreshki-fight-club
npm install
npm run dev
```

### Фазы (обновлённые)

1. **Ядро + Онлайн** → играбельный 1v1 с одним персонажем, online по ссылке с телефона
2. **Контент** → data-driven система, 17 персонажей (кастомизация размеров/аксессуаров), экран выбора
3. **Полировка** → комбо-система, UI, звуки, экран победы, лобби/инвайт-линки
4. **Расширение** → статистика побед, лидерборд, возможно турнирный режим

### Формат карточки персонажа (для фазы 2)

```
Имя/Никнейм: Петро
Прозвище в игре: "Long guy"
Особенность: высокий волейболист
Суперудар: "Удар мячом" — выпускает волейбольный мяч в врага
Статы: сила 7, скорость 5, здоровье 8
Визуал: более высокая моделька, спортивный костюм, темные волосы
```

→ Конвертируется в JSON-конфиг с `scale`, `palette`, `accessories`, `moves`

### Рекомендация

**Начать с фазы 1** — один персонаж, базовый бой, online. Выложить друзьям ссылку в Telegram: "зайди с телефона, подерись со мной". Ранний фидбек от "Корешков" = лучший гейм-дизайн документ.

---

## Ключевые ресурсы

### Спрайты (CC0, бесплатно)
- [Medieval Warrior Pack](https://luizmelo.itch.io/medieval-warrior-pack) — 13 анимаций
- [Martial Hero](https://luizmelo.itch.io/martial-hero) — 8 анимаций
- [Martial Hero 2](https://luizmelo.itch.io/martial-hero-2) — 8 анимаций
- [Каталог itch.io: free fighting pixel art](https://itch.io/game-assets/free/tag-fighting/tag-pixel-art)

### Код и туториалы
- [Phaser 3 + Vite + TS шаблон](https://github.com/phaserjs/template-vite-ts)
- [sf3js-old (Phaser 3 файтинг)](https://github.com/samurai-js/sf3js-old)
- [Max-im/street-fighter (TS файтинг с демо)](https://github.com/Max-im/street-fighter)
- [Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html)
- [Andrea Jens: Fighting Game Guide Parts 3-4](https://andrea-jens.medium.com/)

### Архитектура и frame data
- [Castagne Engine (data-driven)](https://castagneengine.com/)
- [USF4 Frame Data JSON](https://github.com/jpgnotgif/usf4-frame-data)
- [Input buffer implementation](https://seung-cha.github.io/coding/2024/01/26/fighting-game-input-buffer.html)
- [Fighting game input systems](https://pangaea.neocities.org/post/fighting-game-input-systems/)

### Мультиплеер
- [Colyseus (rooms + matchmaking)](https://colyseus.io/)
- [rollback-netcode npm](https://github.com/someusername6/rollback-netcode)
- [Phaser 3 multiplayer tutorial](https://gamedevacademy.org/creating-a-simple-multiplayer-game-in-phaser-3-with-an-authoritative-server-part-1/)

### Хостинг (бесплатно)
- GitHub Pages: клиент (100 GB/мес)
- Deno Deploy: WebSocket сервер (100K req/день, TS нативно)
- Render free tier: Colyseus (cold start ~30 сек)
- Cloudflare Workers + Durable Objects: альтернатива (100K req/день)
