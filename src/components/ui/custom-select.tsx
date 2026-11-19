"use client";

import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

interface CustomSelectProps {
  id?: string;
  name: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  dropdownClassName?: string;
}

export function CustomSelect({
  id,
  name,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  placeholder = "Select an option",
  icon,
  disabled = false,
  required = false,
  className = "",
  dropdownClassName = "",
}: CustomSelectProps) {
  const [internalValue, setInternalValue] = useState<string>(
    controlledValue !== undefined
      ? controlledValue
      : defaultValue !== undefined
      ? defaultValue
      : options[0]?.value || ""
  );
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentValue = controlledValue !== undefined ? controlledValue : internalValue;
  const selectedOption = options.find((opt) => opt.value === currentValue);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(val: string) {
    if (disabled) return;
    if (controlledValue === undefined) {
      setInternalValue(val);
    }
    if (onChange) {
      onChange(val);
    }
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${disabled ? "is-disabled" : ""} ${className}`}
      id={id ? `${id}-container` : undefined}
    >
      {/* Hidden input for standard HTML form submission / FormData */}
      <input
        type="hidden"
        name={name}
        id={id}
        value={currentValue}
        required={required}
      />

      {/* Trigger Button */}
      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? "is-active" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <div className="custom-select-trigger-left">
          {icon && <span className="custom-select-icon">{icon}</span>}
          <span className={`custom-select-label ${!selectedOption ? "is-placeholder" : ""}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`custom-select-chevron ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          className={`custom-select-menu ${dropdownClassName}`}
          role="listbox"
          tabIndex={-1}
        >
          <div className="custom-select-list">
            {options.map((option) => {
              const isSelected = option.value === currentValue;
              return (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`custom-select-item ${isSelected ? "is-selected" : ""}`}
                  onClick={() => handleSelect(option.value)}
                >
                  <div className="custom-select-item-content">
                    <span className="custom-select-item-label">{option.label}</span>
                    {option.description && (
                      <span className="custom-select-item-desc">{option.description}</span>
                    )}
                  </div>

                  <div className="custom-select-item-right">
                    {option.badge && (
                      <span className="custom-select-item-badge">{option.badge}</span>
                    )}
                    {isSelected && (
                      <span className="custom-select-check">
                        <Check size={15} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-select-container {
          position: relative;
          width: 100%;
          font-family: inherit;
        }

        .custom-select-trigger {
          width: 100%;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          color: #0f172a;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          outline: none;
          text-align: left;
        }

        .custom-select-trigger:hover:not(:disabled) {
          border-color: #94a3b8;
          background: #fafbfc;
        }

        .custom-select-trigger.is-active,
        .custom-select-trigger:focus {
          border-color: #0f2b48;
          box-shadow: 0 0 0 3px rgba(15, 43, 72, 0.1);
        }

        .custom-select-trigger:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .custom-select-trigger-left {
          display: flex;
          align-items: center;
          gap: 10px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .custom-select-icon {
          color: #64748b;
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .custom-select-label {
          color: #0f172a;
          font-size: 13px;
          font-weight: 500;
        }

        .custom-select-label.is-placeholder {
          color: #94a3b8;
        }

        .custom-select-chevron {
          color: #64748b;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.15s;
          flex-shrink: 0;
          margin-left: 8px;
        }

        .custom-select-chevron.rotate-180 {
          transform: rotate(180deg);
          color: #0f2b48;
        }

        /* Floating Menu */
        .custom-select-menu {
          position: absolute;
          top: calc(100% + 5px);
          left: 0;
          right: 0;
          z-index: 9999;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 25px -4px rgba(15, 23, 42, 0.12),
                      0 4px 6px -2px rgba(15, 23, 42, 0.05);
          padding: 5px;
          overflow: hidden;
          animation: selectFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes selectFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .custom-select-list {
          max-height: 250px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
          /* Smooth slim scrollbar */
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .custom-select-list::-webkit-scrollbar {
          width: 5px;
        }
        .custom-select-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .custom-select-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
          user-select: none;
        }

        .custom-select-item:hover {
          background: #f1f5f9;
        }

        .custom-select-item.is-selected {
          background: #eff6ff;
        }

        .custom-select-item-content {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .custom-select-item-label {
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
        }

        .custom-select-item.is-selected .custom-select-item-label {
          color: #1e40af;
          font-weight: 600;
        }

        .custom-select-item-desc {
          font-size: 11px;
          color: #64748b;
        }

        .custom-select-item.is-selected .custom-select-item-desc {
          color: #3b82f6;
        }

        .custom-select-item-right {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-left: 10px;
        }

        .custom-select-item-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          background: #e2e8f0;
          color: #475569;
        }

        .custom-select-check {
          color: #2563eb;
          display: flex;
          align-items: center;
        }
      `}</style>
    </div>
  );
}
