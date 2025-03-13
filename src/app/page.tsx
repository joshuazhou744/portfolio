import Link from 'next/link'
import { MusicPlayer } from '../components/music-player'
import { NewsWindow } from '../components/news-window'
import { Taskbar } from '../components/taskbar'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 relative"
          style={{
            backgroundColor: 'rgb(0, 128, 128)',
            backgroundImage: 'url("https://web-assets.same.dev/1418452815/388079722.gif")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '100vh',
            overflow: 'hidden'
          }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 z-10">
        <div className="col-span-1">
          <MusicPlayer />
        </div>
        <div className="col-span-1">
          <NewsWindow />
        </div>
      </div>
      <Taskbar />
    </main>
  )
}
