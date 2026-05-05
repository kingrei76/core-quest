import { NavLink } from 'react-router-dom'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/inbox', label: 'Inbox', icon: '+' },
  { to: '/quests', label: 'Quests', icon: '\u2694' },
  { to: '/character', label: 'Hero', icon: '\u{1F6E1}' },
  { to: '/notes', label: 'Notes', icon: '\u{1F4DC}' },
  { to: '/encounter', label: 'Spike', icon: '\u{1F300}' },
]

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.item} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.icon}>{icon}</span>
            <span className={styles.label}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
