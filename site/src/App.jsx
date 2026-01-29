import './App.css'
import ColorBends from './components/ColorBends'
import LogoLoop from './components/LogoLoop'
import WhitespaceReveal from './components/WhitespaceReveal'
import GitHubLogo from './assets/logos/GitHub_Invertocat_White_Clearspace.svg'
import LinkedInLogo from './assets/logos/InBug-White.png'
import InstagramLogo from './assets/logos/Instagram_Glyph_White.svg'
import ResumeDownloadIcon from './assets/logos/filedownload.svg'
import TextType from './components/TextType'

export default function App() {

  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 520px)').matches;

  return (
    <div className="page">
      {/* background layer */}
      <div className="background">
        <ColorBends
          colors={['#f84040', '#f0d55d', '#379e40', '#3884c7ff', '#ce66b4']}
          fps={40}
        />
      </div>

      {/* foreground content */}
      <main className="container">
        <div className="hero-type">
          <TextType 
            text={["Hi! I'm Landon Holland.", "Welcome to my portfolio.", "It's good to see you.", "Happy coding!"]}
            typingSpeed={25}
            pauseDuration={2300}
            showCursor
            cursorCharacter="|"
            texts={["Welcome to React Bits! Good to see you!","Build some amazing experiences!"]}
            deletingSpeed={35}
            cursorBlinkDuration={0.5}
          />
        </div>
      </main>

      <WhitespaceReveal />

      {/* fixed logo scroller (does not move when scrolling) */}
      <LogoLoop
        className="site-logo-strip"
        logos={[
          { src: GitHubLogo, href: 'https://github.com/landonholl', alt: 'GitHub' },
          { src: LinkedInLogo, href: 'https://linkedin.com/in/landon-holland-743113159', alt: 'LinkedIn' },
          { src: InstagramLogo, href: 'https://www.instagram.com/reallandonholland', alt: 'Instagram' },
          { src: ResumeDownloadIcon,
            href: '/LandonHollandResume.pdf', 
            alt: 'Resume', 
            download: true, 
            downloadName: 'Landon_Holland_Resume.pdf' }
        ]}
        width={2048}
        logoHeight={36}
        gap={isMobile ? 120 : 280}
        speed={64}
        pauseOnHover={true}
        swipe={true}
      />
    </div>
  )
}
