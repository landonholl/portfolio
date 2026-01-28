import React from 'react'
import './WhitespaceReveal.css'
import GlassSurface from './GlassSurface'

const defaultSections = [
  {
    title: 'Software',
    subtitle: 'Software & Web application development, Fullstack engineering, DevOps',
    body:
      'Agile & Scrum based work experience with Docker Containerization, AWS, Windows, MacOS, Linux, JAVA, Javascript, TypeScript, CSS, Tailwind, Python, Github Runners CI/CD, REST APIs, GraphQL, SQL & NoSQL databases.'
  },
  {
    title: 'Game Development',
    subtitle: 'Unity, Node-based visualisation, 3D modeling, AR/VR/MR, Modding and Plugins',
    body:
      'Built multiple 3D games and simulations using Unity and Blender. Experience with C#, Blueprints, Shadergraphs, Blender, and 3D asset creation. Developed mods and plugins for Minecraft Java Edition using the Forge API, the paper API respectively.'
  },
  {
    title: 'Operating Systems',
    subtitle: 'Linux, Windows, MacOS, Embedded Systems, Multithreading, Systems Programming, C/C++',
    body:
      'Experience with low-level programming, and multithreading in C and C++. Comfortable working with various operating systems including Linux distributions, Windows, and MacOS. Familiar with embedded systems development and optimization.'
  }
]

export default function WhitespaceReveal({ sections }) {
  const list = sections && sections.length ? sections : defaultSections

  return (
    <section className="wr-row" aria-label="Capabilities">
      <div className="wr-grid">
        {list.slice(0, 3).map((s, i) => (
          <div className="wr-cardWrap" key={i}>
            <GlassSurface
              className="wr-glassCard"
              width="100%"
              height="auto"
              borderRadius={34}
              backgroundOpacity={0.08}
              blur={9}
              saturation={1.1}
              displace={0.25}
              style={{ height: '100%' }}
            >
              <article className="wr-card" tabIndex={0}>
                <div className="wr-card-content">
                  {s.icon ? <img src={s.icon} alt="" className="wr-icon" /> : null}
                  <h3 className="wr-title">{s.title}</h3>
                  {s.subtitle ? <p className="wr-sub">{s.subtitle}</p> : null}
                  {s.body ? <p className="wr-body">{s.body}</p> : null}
                </div>
              </article>
            </GlassSurface>
          </div>
        ))}
      </div>
    </section>
  )
}
