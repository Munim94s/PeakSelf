import React, { useMemo, useState } from 'react';
import './AdminSessions.css';

export default function AdminSettings() {
  const [tab, setTab] = useState('general');
  const [palette, setPalette] = useState('neutral');

  const palettes = useMemo(() => ([
    { key: 'neutral', name: 'Neutral', tones: ['#111','#333','#888','#e0e0e0','#fff'] },
    { key: 'dim', name: 'Dim', tones: ['#111','#222','#555','#cfcfcf','#f6f6f6'] },
    { key: 'contrast', name: 'High Contrast', tones: ['#000','#111','#666','#dddddd','#ffffff'] },
    { key: 'mono', name: 'Mono', tones: ['#111','#444','#777','#bbbbbb','#f2f2f2'] }
  ]), []);

  const tabs = [
    { key: 'general', label: 'General' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'security', label: 'Security' },
    { key: 'email', label: 'Email' }
  ];

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Settings</div>
        </div>
        <div className="traffic-chip-row">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`traffic-chip ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: '#fff',
        border: '1px solid #d0d0d0',
        borderRadius: 12,
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        {tab === 'general' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, marginBottom: 4 }}>General Settings</h2>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Basic configuration for your site</p>
            </div>
            <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 600 }}>
              <Field label="Site Title">
                <input type="text" placeholder="PeakSelf" style={inputStyle} />
              </Field>
              <Field label="Support Email">
                <input type="email" placeholder="support@example.com" style={inputStyle} />
              </Field>
              <Field label="Tagline">
                <textarea rows={3} placeholder="A short description of your site" style={inputStyle} />
              </Field>
              <Field label="Maintenance Mode" description="Enable this to show a maintenance page to visitors">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 13 }}>Enable maintenance mode</span>
                </label>
              </Field>
            </div>
          </div>
        )}

        {tab === 'appearance' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, marginBottom: 4 }}>Appearance</h2>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Customize the look and feel</p>
            </div>
            <div style={{ display: 'grid', gap: '1.5rem', maxWidth: 600 }}>
              <Field label="Theme" description="Choose between light, dark, or auto mode">
                <div style={{ display: 'flex', gap: 12 }}>
                  {['Light', 'Auto', 'Dark'].map((theme) => (
                    <label key={theme} style={{
                      flex: 1,
                      padding: '12px',
                      border: '2px solid #d0d0d0',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: 13,
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      background: theme === 'Light' ? '#111' : '#fff',
                      color: theme === 'Light' ? '#fff' : '#111'
                    }}>
                      <input type="radio" name="theme" defaultChecked={theme === 'Light'} style={{ display: 'none' }} />
                      {theme}
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Color Palette" description="Select your preferred color scheme">
                <div style={{ display: 'grid', gap: 12 }}>
                  {palettes.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPalette(p.key)}
                      style={{
                        padding: '12px 16px',
                        border: palette === p.key ? '2px solid #111' : '1px solid #d0d0d0',
                        borderRadius: 8,
                        background: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {p.tones.map((t, i) => (
                          <div key={i} style={{ width: 20, height: 20, background: t, borderRadius: 4, border: '1px solid #ddd' }} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, marginBottom: 4 }}>Security</h2>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Authentication and session options</p>
            </div>
            <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 600 }}>
              <Field label="JWT Expiry" description="Number of days before tokens expire">
                <input type="number" min={1} max={30} defaultValue={1} style={inputStyle} />
              </Field>
              <Field label="Two-Factor Authentication">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 13 }}>Require 2FA for all users</span>
                </label>
              </Field>
              <Field label="Email Login">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 13 }}>Allow login with email and password</span>
                </label>
              </Field>
            </div>
          </div>
        )}

        {tab === 'email' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, marginBottom: 4 }}>Email Configuration</h2>
              <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Configure email settings and SMTP</p>
            </div>
            <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 600 }}>
              <Field label="From Name">
                <input type="text" placeholder="PeakSelf" style={inputStyle} />
              </Field>
              <Field label="From Address">
                <input type="email" placeholder="no-reply@example.com" style={inputStyle} />
              </Field>
              <Field label="SMTP Configuration">
                <div style={{
                  padding: '12px 16px',
                  background: '#f6f6f6',
                  border: '1px solid #d0d0d0',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Status</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Not configured</div>
                  </div>
                  <button className="btn small" type="button">Configure</button>
                </div>
              </Field>
            </div>
          </div>
        )}

        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end'
        }}>
          <button className="btn secondary" type="button">Reset Changes</button>
          <button className="btn primary" type="button">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d0d0d0',
  borderRadius: 8,
  fontSize: 14,
  background: '#fff',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s ease',
  outline: 'none'
};

function Field({ label, description, children }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', marginBottom: 2 }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: '#888' }}>{description}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
