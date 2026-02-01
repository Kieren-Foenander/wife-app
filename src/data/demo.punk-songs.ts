export type PunkSong = {
  id: string
  name: string
  artist: string
}

const punkSongs: Array<PunkSong> = [
  { id: '1', name: 'Blitzkrieg Bop', artist: 'Ramones' },
  { id: '2', name: 'London Calling', artist: 'The Clash' },
  { id: '3', name: 'Holiday in Cambodia', artist: 'Dead Kennedys' },
  { id: '4', name: 'Rise Above', artist: 'Black Flag' },
  { id: '5', name: 'Knowledge', artist: 'Operation Ivy' },
]

export function getPunkSongs(): Array<PunkSong> {
  return punkSongs
}
