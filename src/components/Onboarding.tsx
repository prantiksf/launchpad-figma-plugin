import React, { useState, useRef } from 'react';

// Import assets
import OnboardingIllustration from '../assets/starterkit_illustration.png';
import StarterKitIcon from '../assets/Starter Kit _icon.png';

// Import cloud icons
import SalesCloudIcon from '../assets/SalesCloud-icon.png';
import ServiceCloudIcon from '../assets/ServiceCloud-icon.png';
import MarketingCloudIcon from '../assets/MarketingCloud-icon.png';
import CommerceCloudIcon from '../assets/CommerceCloud-icon.png';
import RevenueCloudIcon from '../assets/RevenueCloud-icon.png';
import FieldServiceCloudIcon from '../assets/FieldServiceCloud-icon.png';

interface Cloud {
  id: string;
  name: string;
  icon: string;
  isCustom?: boolean;
}

interface OnboardingProps {
  onComplete: (selectedCloud: string, customCloud?: Cloud) => void;
  customClouds?: Cloud[];
}

const defaultClouds: Cloud[] = [
  { id: 'sales', name: 'Sales', icon: SalesCloudIcon },
  { id: 'marketing', name: 'Marketing', icon: MarketingCloudIcon },
  { id: 'commerce', name: 'Commerce', icon: CommerceCloudIcon },
  { id: 'fieldservice', name: 'Field Service', icon: FieldServiceCloudIcon },
  { id: 'service', name: 'Service', icon: ServiceCloudIcon },
  { id: 'revenue', name: 'Revenue', icon: RevenueCloudIcon },
];

export function Onboarding({ onComplete, customClouds = [] }: OnboardingProps) {
  const allClouds = [...defaultClouds, ...customClouds];
  // Auto-select first cloud by default for better UX
  const [selectedCloud, setSelectedCloud] = useState<string | null>(allClouds.length > 0 ? allClouds[0].id : null);
  const [view, setView] = useState<'select' | 'addCloud'>('select');
  const [newCloudName, setNewCloudName] = useState('');
  const [newCloudIcon, setNewCloudIcon] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCloudSelect = (cloudId: string) => {
    setSelectedCloud(cloudId);
  };

  const handleGetStarted = () => {
    if (selectedCloud) {
      onComplete(selectedCloud);
    }
  };

  const handleIconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewCloudIcon(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCloud = () => {
    if (newCloudName.trim() && newCloudIcon) {
      const customCloud: Cloud = {
        id: `custom-${Date.now()}`,
        name: newCloudName.trim(),
        icon: newCloudIcon,
        isCustom: true,
      };
      onComplete(customCloud.id, customCloud);
    }
  };

  // Add Cloud View
  if (view === 'addCloud') {
    return (
      <div className="onboarding">
        <div className="onboarding__header">
          <button className="onboarding__back-btn" onClick={() => setView('select')}>
            ← Back
          </button>
        </div>

        <div className="onboarding__logo">
          <img src={StarterKitIcon} alt="Starter Kit" className="onboarding__icon" />
          <h1 className="onboarding__title">
            <span className="onboarding__title-gradient">starter</span>
            <span className="onboarding__title-kit">KIT</span>
          </h1>
        </div>

        <div className="onboarding__add-form">
          <h2 className="onboarding__form-title">Add Your Cloud / Team</h2>
          
          {/* Icon Upload */}
          <div className="onboarding__icon-upload" onClick={() => fileInputRef.current?.click()}>
            {newCloudIcon ? (
              <img src={newCloudIcon} alt="Cloud icon" className="onboarding__uploaded-icon" />
            ) : (
              <div className="onboarding__icon-placeholder">
                <span>+</span>
                <span className="onboarding__icon-hint">Upload Icon</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleIconUpload}
              style={{ display: 'none' }}
            />
          </div>

          {/* Cloud Name Input */}
          <input
            type="text"
            className="onboarding__input"
            placeholder="Enter cloud or team name"
            value={newCloudName}
            onChange={(e) => setNewCloudName(e.target.value)}
          />
        </div>

        {/* Next Button */}
        {newCloudName.trim() && newCloudIcon && (
          <button className="onboarding__cta" onClick={handleAddCloud}>
            Get Started →
          </button>
        )}
      </div>
    );
  }

  // Main Selection View
  return (
    <div className="onboarding">
      {/* Logo Section */}
      <div className="onboarding__logo">
        <img src={StarterKitIcon} alt="Starter Kit" className="onboarding__icon" />
        <h1 className="onboarding__title">
          <span className="onboarding__title-gradient">starter</span>
          <span className="onboarding__title-kit">KIT</span>
        </h1>
        <p className="onboarding__tagline">Get, Set Go with your design assets</p>
      </div>

      {/* Illustration */}
      <div className="onboarding__illustration">
        <img src={OnboardingIllustration} alt="Get started" />
      </div>

      {/* Cloud Selection */}
      <div className="onboarding__selection">
        <p className="onboarding__label">Get started with your cloud</p>
        
        <div className="onboarding__clouds">
          {allClouds.map(cloud => (
            <button
              key={cloud.id}
              className={`onboarding__cloud-btn ${selectedCloud === cloud.id ? 'is-selected' : ''}`}
              onClick={() => handleCloudSelect(cloud.id)}
              title={cloud.name}
            >
              <img src={cloud.icon} alt={cloud.name} />
            </button>
          ))}
          
          <button 
            className="onboarding__add-btn"
            onClick={() => setView('addCloud')}
            title="Add your team"
          >
            +
          </button>
        </div>
      </div>

      {/* Get Started Button */}
      <button 
        className="onboarding__cta" 
        onClick={handleGetStarted}
        disabled={!selectedCloud}
        style={{ 
          opacity: selectedCloud ? 1 : 0.5,
          cursor: selectedCloud ? 'pointer' : 'not-allowed'
        }}
      >
        Get Started →
      </button>
    </div>
  );
}

export default Onboarding;
