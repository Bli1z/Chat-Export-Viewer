import { useState, useEffect } from 'react';
import './DisclaimerBanner.css';

const DISCLAIMER_DISMISSED_KEY = 'chat-export-viewer-disclaimer-dismissed';

export function DisclaimerBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has already dismissed the disclaimer
        const dismissed = localStorage.getItem(DISCLAIMER_DISMISSED_KEY);
        if (!dismissed) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem(DISCLAIMER_DISMISSED_KEY, 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="disclaimer-banner">
            <div className="disclaimer-content">
                <span className="disclaimer-icon">👋</span>
                <p className="disclaimer-text">
                    Welcome! This app processes all data offline. We are not affiliated with WhatsApp Inc.
                </p>
                <button
                    className="disclaimer-dismiss"
                    onClick={handleDismiss}
                    aria-label="Dismiss"
                >
                    Got it
                </button>
            </div>
        </div>
    );
}
