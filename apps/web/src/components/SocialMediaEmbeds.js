'use client';

import { InstagramIcon, TikTokIcon, LinkedInIcon } from './brand/ServiceLogos.js';
import { CheckIcon, CrossIcon } from './brand/UIIcons.js';

/**
 * SocialMediaEmbeds
 * Native High-Contrast Social Intelligence Cards for Instagram, TikTok & LinkedIn.
 * Clean, fast, and 100% compliant with browser frame security rules.
 */
export function SocialMediaEmbeds({
  instagramUrl,
  instagramBio,
  instagramFollowers,
  instagramPosts,
  tiktokUrl,
  tiktokFollowers,
  tiktokLikes,
  tiktokBio,
  linkedinUrl,
  linkedinEmployees,
  linkedinIndustry,
}) {
  const hasInstagram = Boolean(instagramUrl);
  const hasTikTok = Boolean(tiktokUrl);
  const hasLinkedIn = Boolean(linkedinUrl);

  const extractHandle = (url, platform) => {
    if (!url) return null;
    let clean = url.trim().replace(/\/$/, '');
    const parts = clean.split('/');
    let handle = parts[parts.length - 1] || parts[parts.length - 2] || '';
    handle = handle.replace('@', '').split('?')[0];
    return handle ? `@${handle}` : platform;
  };

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <span className="eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>AUDITORIA DE PRESENÇA SOCIAL NATIVA</span>
        <h3 className="tzolkin-title" style={{ fontSize: 18 }}>CANAI SOCIAL & INTELIGÊNCIA</h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {/* INSTAGRAM CARD */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <InstagramIcon size={18} />
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--tzolkin-offwhite)' }}>Instagram</span>
              </div>
              <span style={{
                fontSize: 10,
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 100,
                background: hasInstagram ? 'var(--success-soft)' : 'var(--error-soft)',
                color: hasInstagram ? 'var(--success)' : 'var(--error)',
                border: hasInstagram ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
              }}>
                {hasInstagram ? 'DETECTADO' : 'NÃO ENCONTRADO'}
              </span>
            </div>

            {hasInstagram ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginBottom: 8 }}>
                  {extractHandle(instagramUrl, 'Instagram')}
                </div>

                {(instagramFollowers || instagramPosts) && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                    {instagramFollowers && <div><strong>{instagramFollowers}</strong> seguidores</div>}
                    {instagramPosts && <div><strong>{instagramPosts}</strong> posts</div>}
                  </div>
                )}

                {instagramBio && (
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 14 }}>
                    &ldquo;{instagramBio.slice(0, 110)}{instagramBio.length > 110 ? '...' : ''}&rdquo;
                  </p>
                )}

                {/* Embed Nativo de Instagram */}
                {extractHandle(instagramUrl, '') && (
                  <div style={{ marginTop: 12, marginBottom: 14, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-primary)', background: '#000', height: 420 }}>
                    <iframe
                      src={`https://www.instagram.com/${extractHandle(instagramUrl, '').replace('@', '')}/embed`}
                      title="Instagram Embed"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      frameBorder="0"
                      scrolling="no"
                      allowtransparency="true"
                    />
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 14px' }}>
                Nenhum perfil oficial rastreado no Instagram para este negócio.
              </p>
            )}
          </div>

          {hasInstagram && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
            >
              <InstagramIcon size={12} /> Abrir Instagram no App ↗
            </a>
          )}
        </div>

        {/* TIKTOK CARD */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TikTokIcon size={18} />
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--tzolkin-offwhite)' }}>TikTok</span>
              </div>
              <span style={{
                fontSize: 10,
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 100,
                background: hasTikTok ? 'var(--success-soft)' : 'rgba(255, 255, 255, 0.05)',
                color: hasTikTok ? 'var(--success)' : 'var(--text-tertiary)',
                border: hasTikTok ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-primary)',
              }}>
                {hasTikTok ? 'DETECTADO' : 'NÃO CONFIGURADO'}
              </span>
            </div>

            {hasTikTok ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginBottom: 8 }}>
                  {extractHandle(tiktokUrl, 'TikTok')}
                </div>

                {(tiktokFollowers || tiktokLikes) && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)' }}>
                    {tiktokFollowers && <div><strong>{tiktokFollowers}</strong> seguidores</div>}
                    {tiktokLikes && <div><strong>{tiktokLikes}</strong> curtidas</div>}
                  </div>
                )}

                {tiktokBio && (
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 14 }}>
                    &ldquo;{tiktokBio.slice(0, 110)}{tiktokBio.length > 110 ? '...' : ''}&rdquo;
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 14px' }}>
                Canal TikTok não vinculado. Oportunidade para produção de vídeos curtos.
              </p>
            )}
          </div>

          {hasTikTok && (
            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
            >
              <TikTokIcon size={12} /> Ver TikTok ↗
            </a>
          )}
        </div>

        {/* LINKEDIN CARD */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-md)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LinkedInIcon size={18} />
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--tzolkin-offwhite)' }}>LinkedIn</span>
              </div>
              <span style={{
                fontSize: 10,
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 100,
                background: hasLinkedIn ? 'var(--success-soft)' : 'rgba(255, 255, 255, 0.05)',
                color: hasLinkedIn ? 'var(--success)' : 'var(--text-tertiary)',
                border: hasLinkedIn ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-primary)',
              }}>
                {hasLinkedIn ? 'DETECTADO' : 'NÃO CONFIGURADO'}
              </span>
            </div>

            {hasLinkedIn ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--tzolkin-offwhite)', marginBottom: 14 }}>
                  {extractHandle(linkedinUrl, 'LinkedIn')}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '8px 0 14px' }}>
                Página da empresa no LinkedIn não encontrada na busca automatizada.
              </p>
            )}
          </div>

          {hasLinkedIn && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center', fontSize: 11 }}
            >
              <LinkedInIcon size={12} /> Ver LinkedIn ↗
            </a>
          )}
        </div>

      </div>
    </div>
  );
}
