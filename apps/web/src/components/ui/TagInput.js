'use client';

import { useState } from 'react';
import { CrossIcon } from '../brand/UIIcons.js';

/**
 * A reusable Tag Input component.
 * Allows users to type and press Enter or Comma to add a tag.
 * 
 * @param {Object} props
 * @param {string[]} props.tags - Current tags
 * @param {(tags: string[]) => void} props.onChange - Callback when tags change
 * @param {string} props.placeholder - Input placeholder
 */
export function TagInput({ tags = [], onChange, placeholder = 'Adicionar...' }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleBlur = () => {
    addTag();
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove) => {
    onChange(tags.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div 
      className="input" 
      style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 6, 
        padding: '6px 8px', 
        alignItems: 'center',
        minHeight: 40,
        height: 'auto'
      }}
    >
      {tags.map((tag, i) => (
        <span 
          key={i} 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(250, 250, 247, 0.1)',
            color: 'var(--tzolkin-offwhite)',
            border: '1px solid rgba(250, 250, 247, 0.2)',
            borderRadius: 6,
            padding: '2px 6px 2px 8px',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {tag}
          <button 
            type="button" 
            onClick={() => removeTag(i)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 14,
              height: 14,
              borderRadius: '50%',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            <CrossIcon size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : ''}
        style={{
          flex: 1,
          minWidth: 120,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: 13,
          outline: 'none',
          padding: '2px 4px',
        }}
      />
    </div>
  );
}
