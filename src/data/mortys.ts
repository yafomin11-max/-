import { MortyCard } from '../types/game';

export const INITIAL_MORTY_CARDS: MortyCard[] = [
  {
    id: 'mermaid-morty',
    number: 1,
    name: 'РУСАЛКА МОРТИ',
    type: 'ROCK',
    maxHp: 145,
    weakness: ['PAPER'],
    rarity: 'Rare',
    image: 'https://rickandmortyapi.com/api/character/avatar/21.jpeg',
    flavorQuote: '«...Ауее... чувак... Я между сладкого кобеления смерты...»',
    description: 'Если соперник побеждает Русалку Морти, то можно брызнуть на него водой, чтобы оживить вашего драгоценного рыбного паренька. Давайте, всё нормально, ей-бог сказал, что так можно.',
    moves: [
      {
        id: 'plyukh',
        name: 'ПЛЮХ',
        type: 'ROCK',
        baseDamage: 68,
        accuracy: 0.95,
        description: 'Мощный плеск хвостовым плавником водяного паренька.'
      },
      {
        id: 'water-wave',
        name: 'ВОДНАЯ ВОЛНА',
        type: 'ROCK',
        baseDamage: 85,
        accuracy: 0.85,
        description: 'Окатывает соперника брызгами Атлантиды.'
      }
    ]
  },
  {
    id: 'evil-morty',
    number: 2,
    name: 'ЗЛОЙ МОРТИ',
    type: 'SCISSORS',
    maxHp: 666,
    weakness: ['ROCK'],
    rarity: 'Legendary',
    image: 'https://rickandmortyapi.com/api/character/avatar/118.jpeg',
    flavorQuote: '«Если долго смотришь в бездну, то бездна начинает смотреть в тебя...» — Ницше.',
    description: 'Злого Морти могут одолеть только старый и молодой священники, работающие вместе. Цитадель — это весело, если с вами ПокаМорти!',
    moves: [
      {
        id: 'infinite-darkness',
        name: 'БЕСКОНЕЧНАЯ ТЬМА',
        type: 'SCISSORS',
        baseDamage: 666,
        accuracy: 0.9,
        description: 'Уничтожает разумы противников своей темной хладнокровной стратегией.'
      },
      {
        id: 'eyepatch-laser',
        name: 'ЛАЗЕР ПОВЯЗКИ',
        type: 'SCISSORS',
        baseDamage: 120,
        accuracy: 1.0,
        description: 'Сфокусированный луч из тайного пульта Цитадели.'
      }
    ]
  },
  {
    id: 'spork-morty',
    number: 3,
    name: 'МОРТИ С ВИЛКОЛОЖКОЙ',
    type: 'ANY',
    maxHp: 50,
    weakness: ['ROCK', 'PAPER', 'SCISSORS'],
    rarity: 'Common',
    image: 'https://rickandmortyapi.com/api/character/avatar/27.jpeg',
    flavorQuote: '«Зубцы, ну пути, бесполезны, но ими отлично можно пырнуть себя в дёсны».',
    description: 'Пудинг? Конечно! Салат? Может быть! Суп? Наверное! С виклоложкой можно съесть почти всё что угодно, более или менее.',
    moves: [
      {
        id: 'adaptation',
        name: 'АДАПТАЦИЯ',
        type: 'ANY',
        baseDamage: 45,
        accuracy: 1.0,
        description: 'Приспосабливается к любой ситуации и типу урона.'
      },
      {
        id: 'fork-poke',
        name: 'ТЫЧОК ВИЛКОЙ',
        type: 'ANY',
        baseDamage: 30,
        accuracy: 0.95,
        description: 'Быстрый тычок кухонным гибридом.'
      }
    ]
  },
  {
    id: 'robot-morty',
    number: 4,
    name: 'РОБОТ МОРТИ',
    type: 'ROCK',
    maxHp: 500,
    weakness: ['PAPER'],
    rarity: 'Epic',
    image: 'https://rickandmortyapi.com/api/character/avatar/18.jpeg',
    flavorQuote: '«Я хочу понять человеческие принципы любви, не для атак в конце концов».',
    description: 'Руки Робота Морти — не для любви, он может только крушить. Поэтому он уничтожает любых Морти, к которым прикасается, и друзей, и врагов.',
    moves: [
      {
        id: 'smash',
        name: 'КРУШИТЬ',
        type: 'ROCK',
        baseDamage: 250,
        accuracy: 0.85,
        description: 'Сокрушительный удар стальными клешнями.'
      },
      {
        id: 'laser-beam',
        name: 'ЛАЗЕРНЫЙ ЛУЧ',
        type: 'ROCK',
        baseDamage: 110,
        accuracy: 0.95,
        description: 'Выстрел из робо-глаз прямо в цель.'
      }
    ]
  },
  {
    id: 'cronenberg-morty',
    number: 5,
    name: 'КРОНЕНБЕРГ МОРТИ',
    type: 'PAPER',
    maxHp: 220,
    weakness: ['SCISSORS'],
    rarity: 'Epic',
    image: 'https://rickandmortyapi.com/api/character/avatar/83.jpeg',
    flavorQuote: '«Мутировавший, но полный безумной любви!»',
    description: 'Результат генетического эксперимента Рика C-137. Уродлив на вид, но невероятно силен в плотском бою.',
    moves: [
      {
        id: 'claw-slash',
        name: 'МОРФ УДАР',
        type: 'PAPER',
        baseDamage: 95,
        accuracy: 0.9,
        description: 'Удар гротескно выросшей мутировавшей лапой.'
      },
      {
        id: 'acid-spit',
        name: 'КИСЛОТНЫЙ ПЛЕВОК',
        type: 'PAPER',
        baseDamage: 75,
        accuracy: 0.95,
        description: 'Едкий плюх желудочной кислотой.'
      }
    ]
  },
  {
    id: 'cowboy-morty',
    number: 6,
    name: 'КОВБОЙ МОРТИ',
    type: 'SCISSORS',
    maxHp: 160,
    weakness: ['ROCK'],
    rarity: 'Rare',
    image: 'https://rickandmortyapi.com/api/character/avatar/77.jpeg',
    flavorQuote: '«Йи-ха! Живым или мертвым, ты идешь со мной!»',
    description: 'Родом из измерения Дикого Запада. Быстр на спусковом крючке и всегда готов к дуэли в полдень.',
    moves: [
      {
        id: 'revolver-shot',
        name: 'ВЫСТРЕЛ ВЙО',
        type: 'SCISSORS',
        baseDamage: 80,
        accuracy: 0.9,
        description: 'Меткий выстрел из ковбойского револьвера.'
      },
      {
        id: 'lasso-trap',
        name: 'ПЕТЛЯ ЛАССO',
        type: 'SCISSORS',
        baseDamage: 60,
        accuracy: 1.0,
        description: 'Связывает врага и наносит хитрый урон.'
      }
    ]
  },
  {
    id: 'alien-morty',
    number: 7,
    name: 'ИНОПЛАНЕТНЫЙ МОРТИ',
    type: 'PAPER',
    maxHp: 180,
    weakness: ['SCISSORS'],
    rarity: 'Rare',
    image: 'https://rickandmortyapi.com/api/character/avatar/14.jpeg',
    flavorQuote: '«Глорп зорп! Мой разум вне земных законов!»',
    description: 'Морти из далекого межгалактического сектора. Обладает аномальными ментальными атаками.',
    moves: [
      {
        id: 'telekinesis',
        name: 'ТЕЛЕКИНЕЗ',
        type: 'PAPER',
        baseDamage: 85,
        accuracy: 0.95,
        description: 'Швыряет обломки межгалактических кораблей.'
      },
      {
        id: 'plasma-blast',
        name: 'ПЛАЗМЕННЫЙ ВЗРЫВ',
        type: 'PAPER',
        baseDamage: 105,
        accuracy: 0.85,
        description: 'Инопланетный сгусток чистой плазмы.'
      }
    ]
  },
  {
    id: 'cop-morty',
    number: 8,
    name: 'ПОЛИЦЕЙСКИЙ МОРТИ',
    type: 'ROCK',
    maxHp: 190,
    weakness: ['PAPER'],
    rarity: 'Common',
    image: 'https://rickandmortyapi.com/api/character/avatar/73.jpeg',
    flavorQuote: '«На этих улицах Цитадели правила устанавливаю я!»',
    description: 'Патрульный из Цитадели Риков. Строг, суров и готов применить дубинку по первому сигналу.',
    moves: [
      {
        id: 'baton-strike',
        name: 'УДАР ДУБИНКОЙ',
        type: 'ROCK',
        baseDamage: 75,
        accuracy: 0.95,
        description: 'Официальный полицейский арестный удар.'
      },
      {
        id: 'handcuff-slam',
        name: 'БРОСОК В КАНДАЛАХ',
        type: 'ROCK',
        baseDamage: 90,
        accuracy: 0.9,
        description: 'Задержание с сильным силовым броском.'
      }
    ]
  }
];
