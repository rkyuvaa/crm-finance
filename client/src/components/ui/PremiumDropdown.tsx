import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Layers,
  AlertTriangle,
  Clock,
  Calendar,
  Banknote,
  LucideIcon,
} from 'lucide-react';

export interface PremiumDropdownOption<T = string> {
  value: T;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>;
  count?: number | string;
  disabled?: boolean;
}

export interface PremiumDropdownProps<T = string> {
  value?: T;
  options: PremiumDropdownOption<T>[];
  onChange?: (value: T, option: PremiumDropdownOption<T>) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  triggerWidth?: string | number;
  menuWidth?: string | number;
  disabled?: boolean;
  size?: 'default' | 'compact';
  id?: string;
  'aria-label'?: string;
  portal?: boolean;
}

/**
 * Standard example options and icon mapping for invoice / billing filters:
 * - All Invoices: Layers
 * - Outstanding Invoices: AlertTriangle
 * - Overdue: Clock
 * - Scheduled: Calendar
 * - Paid: Banknote
 */
export const INVOICE_FILTER_OPTIONS: PremiumDropdownOption<string>[] = [
  { value: 'all', label: 'All Invoices', icon: Layers },
  { value: 'outstanding', label: 'Outstanding Invoices', icon: AlertTriangle },
  { value: 'overdue', label: 'Overdue', icon: Clock },
  { value: 'scheduled', label: 'Scheduled', icon: Calendar },
  { value: 'paid', label: 'Paid', icon: Banknote },
];

export function PremiumDropdown<T = string>({
  value,
  options = [],
  onChange,
  placeholder = 'Select an option',
  className = '',
  style,
  triggerWidth = '100%',
  menuWidth,
  disabled = false,
  size = 'default',
  id,
  'aria-label': ariaLabel,
  portal = true,
}: PremiumDropdownProps<T>) {
  const generatedId = useId();
  const dropdownId = id || generatedId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: 'bottom' | 'top';
  }>({
    top: 0,
    left: 0,
    width: 0,
    placement: 'bottom',
  });

  const isDefaultSize = size === 'default';

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Calculate dynamic floating position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const estimatedHeight = Math.min(options.length * (isDefaultSize ? 64 : 44) + 16, 420);

    const shouldPlaceTop = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const top = shouldPlaceTop
      ? Math.max(8, rect.top - estimatedHeight - 10)
      : rect.bottom + 10;

    let left = rect.left;
    let width = rect.width;

    if (menuWidth) {
      if (typeof menuWidth === 'number') {
        width = menuWidth;
      } else if (menuWidth.endsWith('px')) {
        width = parseFloat(menuWidth);
      }
    }

    // Keep menu inside viewport horizontally
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    setCoords({
      top: top + (portal ? window.scrollY : 0),
      left: left + (portal ? window.scrollX : 0),
      width,
      placement: shouldPlaceTop ? 'top' : 'bottom',
    });
  }, [options.length, isDefaultSize, menuWidth, portal]);

  // Open / Close toggling
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      const currentIndex = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (option: PremiumDropdownOption<T>) => {
    if (option.disabled) return;
    onChange?.(option.value, option);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  // Reposition on scroll and resize when open
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            handleSelect(options[highlightedIndex]);
          }
        } else {
          handleToggle();
        }
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          handleToggle();
        } else {
          setHighlightedIndex((prev) => {
            let next = prev + 1;
            while (next < options.length && options[next].disabled) {
              next++;
            }
            return next < options.length ? next : prev;
          });
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          handleToggle();
        } else {
          setHighlightedIndex((prev) => {
            let next = prev - 1;
            while (next >= 0 && options[next].disabled) {
              next--;
            }
            return next >= 0 ? next : prev;
          });
        }
        break;

      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
        break;

      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
        }
        break;

      default:
        break;
    }
  };

  // Trigger styles
  const triggerHeight = isDefaultSize ? 64 : 44;
  const triggerPadding = isDefaultSize ? '0 20px' : '0 14px';
  const fontSize = isDefaultSize ? '17px' : '14px';
  const iconSize = isDefaultSize ? 22 : 18;

  // Selected item Icon component
  const TriggerIcon = selectedOption?.icon;

  // Render floating panel
  const menuContent = (
    <div
      ref={menuRef}
      id={`${dropdownId}-menu`}
      role="listbox"
      aria-labelledby={`${dropdownId}-trigger`}
      style={{
        position: portal ? 'absolute' : 'absolute',
        top: portal ? `${coords.top}px` : coords.placement === 'top' ? 'auto' : 'calc(100% + 10px)',
        bottom: !portal && coords.placement === 'top' ? 'calc(100% + 10px)' : 'auto',
        left: portal ? `${coords.left}px` : 0,
        width: portal ? `${coords.width}px` : menuWidth || '100%',
        minWidth: '220px',
        maxWidth: 'calc(100vw - 24px)',
        backgroundColor: '#FFFFFF',
        border: '1px solid #D7D9DE',
        borderRadius: '18px',
        boxShadow: '0 8px 28px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.04)',
        padding: '8px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        maxHeight: '420px',
        overflowY: 'auto',
        boxSizing: 'border-box',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        animation: 'premiumDropdownFadeIn 0.16s ease-out',
      }}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isHighlighted = index === highlightedIndex;
        const OptionIcon = option.icon;

        return (
          <button
            key={String(option.value)}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={option.disabled}
            onClick={() => handleSelect(option)}
            onMouseEnter={() => setHighlightedIndex(index)}
            style={{
              width: '100%',
              minHeight: isDefaultSize ? '58px' : '40px',
              height: isDefaultSize ? '60px' : '42px',
              display: 'flex',
              alignItems: 'center',
              padding: isDefaultSize ? '0 18px' : '0 12px',
              borderRadius: '14px',
              border: 'none',
              cursor: option.disabled ? 'not-allowed' : 'pointer',
              backgroundColor: isSelected
                ? '#FFF0EB'
                : isHighlighted
                ? '#F8FAFC'
                : 'transparent',
              color: isSelected ? '#E85B2A' : option.disabled ? '#9CA3AF' : '#4B5563',
              fontSize,
              fontWeight: isSelected ? 600 : 500,
              fontFamily: 'inherit',
              textAlign: 'left',
              outline: 'none',
              transition: 'background-color 0.14s ease, color 0.14s ease, transform 0.1s ease',
              opacity: option.disabled ? 0.5 : 1,
              userSelect: 'none',
            }}
          >
            {OptionIcon && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  color: isSelected ? '#E85B2A' : '#4B5563',
                  flexShrink: 0,
                  transition: 'color 0.14s ease',
                }}
              >
                <OptionIcon size={iconSize} />
              </span>
            )}
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {option.label}
            </span>
            {option.count !== undefined && (
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: isSelected ? 'rgba(232, 91, 42, 0.12)' : '#F1F5F9',
                  color: isSelected ? '#E85B2A' : '#64748B',
                  marginLeft: '8px',
                  flexShrink: 0,
                }}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      className={`premium-dropdown-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: triggerWidth,
        ...style,
      }}
    >
      <button
        ref={triggerRef}
        id={`${dropdownId}-trigger`}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${dropdownId}-menu`}
        aria-label={ariaLabel || selectedOption?.label || placeholder}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          height: `${triggerHeight}px`,
          minHeight: `${triggerHeight}px`,
          backgroundColor: '#FFFFFF',
          border: isOpen ? '1px solid #CBD0DC' : '1px solid #D7D9DE',
          borderRadius: '16px',
          padding: triggerPadding,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: isOpen
            ? '0 4px 16px rgba(15, 23, 42, 0.08)'
            : '0 1px 3px rgba(15, 23, 42, 0.02)',
          outline: 'none',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = '#C4C7CF';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = '#D7D9DE';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.02)';
          }
        }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = '#B0B5C0';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(232, 91, 42, 0.12)';
          }
        }}
        onBlur={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.borderColor = '#D7D9DE';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(15, 23, 42, 0.02)';
          }
        }}
      >
        {/* Left Side: Icon & Label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {TriggerIcon && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                color: '#4B5563',
                flexShrink: 0,
              }}
            >
              <TriggerIcon size={iconSize} />
            </span>
          )}
          <span
            style={{
              fontSize,
              fontWeight: 500,
              color: selectedOption ? '#4B5563' : '#9CA3AF',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        {/* Right Side: Downward Chevron */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '12px',
            color: '#4B5563',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <ChevronDown size={isDefaultSize ? 20 : 16} />
        </span>
      </button>

      {/* Dropdown Panel Portal */}
      {isOpen && (portal ? createPortal(menuContent, document.body) : menuContent)}
    </div>
  );
}

export default PremiumDropdown;
