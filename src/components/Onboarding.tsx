import React, { useState } from 'react';

// Import assets
import OnboardingIllustration from '../assets/onboarding-illustration.png';
import LogoBlurEffect from '../assets/logo-blur-effect.png';

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
}

interface OnboardingProps {
  onComplete: (selectedCloud: string) => void;
  onAddCustomCloud: () => void;
}

const defaultClouds: Cloud[] = [
  { id: 'sales', name: 'Sales', icon: SalesCloudIcon },
  { id: 'marketing', name: 'Marketing', icon: MarketingCloudIcon },
  { id: 'commerce', name: 'Commerce', icon: CommerceCloudIcon },
  { id: 'fieldservice', name: 'Field Service', icon: FieldServiceCloudIcon },
  { id: 'service', name: 'Service', icon: ServiceCloudIcon },
  { id: 'revenue', name: 'Revenue', icon: RevenueCloudIcon },
];

export function Onboarding({ onComplete, onAddCustomCloud }: OnboardingProps) {
  const [selectedCloud, setSelectedCloud] = useState<string | null>(null);

  const handleCloudSelect = (cloudId: string) => {
    setSelectedCloud(cloudId);
  };

  const handleGetStarted = () => {
    if (selectedCloud) {
      onComplete(selectedCloud);
    }
  };

  return (
    <div className="onboarding">
      {/* Logo Section */}
      <div className="onboarding__logo">
        <div className="onboarding__logo-blur">
          <img src={LogoBlurEffect} alt="" className="onboarding__blur-img" />
        </div>
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
          {defaultClouds.map(cloud => (
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
            onClick={onAddCustomCloud}
            title="Add your team"
          >
            +
          </button>
        </div>
      </div>

      {/* Get Started Button */}
      {selectedCloud && (
        <button className="onboarding__cta" onClick={handleGetStarted}>
          Get Started →
        </button>
      )}
    </div>
  );
}

export default Onboarding;
