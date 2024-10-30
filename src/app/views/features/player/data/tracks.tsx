// audio files
import beautiful from './a_beautiful_day.mp3'
import world from './We_Are_The_World.mp3'
import top from './dbang-world.mp3'
import cinematic from './cinematic-time-lapse-115672.mp3'
import forest from './forest-lullaby-110624.mp3'
import podcast from './the-podcast-intro-111863.mp3'
import podRocket_01 from './podRocket_01.mp3'

export interface ITrack {
  title: string
  description?: string
  src: string
  author: string
}

export const tracks: ITrack[] = [
  {
    title: 'Trinix ft Rushawn – Its a beautiful day',
    src: beautiful,
    author: 'Trinix ft Rushawn',
  },
  {
    title: 'Michael Jackson – We Are The World',
    src: world,
    author: 'Michael Jackson',
  },
  {
    title: 'D’banj -Top Of The World',
    src: top,
    author: 'Dbanj',
  },
  {
    title: 'Cinematic Time Lapse',
    src: cinematic,
    author: 'Lexin Music',
  },
  {
    title: 'Forest Lullaby',
    src: forest,
    author: 'Lesfm',
  },
  {
    title: 'The Podcast Intro',
    src: podcast,
    author: 'Music Unlimited',
  },
  {
    title: 'Should you use React in 2023? with Tru Narla',
    src: podRocket_01,
    author: 'podRocket',
  },
  {
    title: 'Should you use React in 2023? with Tru Narla',
    src: podRocket_01,
    author: 'podRocket',
  },
  {
    title: 'Should you use React in 2023? with Tru Narla',
    src: podRocket_01,
    author: 'podRocket',
  },
  {
    title: 'Should you use React in 2023? with Tru Narla',
    src: podRocket_01,
    author: 'podRocket',
  },
  {
    title: 'Should you use React in 2023? with Tru Narla',
    src: podRocket_01,
    author: 'podRocket',
  },
]
