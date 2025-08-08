import React, { useState, useEffect } from 'react';
import Notification from './Notification';

const NotificationManager = () => {
  const [notifications, setNotifications] = useState([]);

  // Bildirim ekleme fonksiyonu
  const addNotification = (notification) => {
    const id = Date.now();
    const newNotification = {
      id,
      ...notification,
      time: 'şimdi'
    };

    setNotifications(prev => [...prev, newNotification]);

    // 4 saniye sonra bildirimi kaldır
    setTimeout(() => {
      removeNotification(id);
    }, 4000);
  };

  // Bildirim kaldırma fonksiyonu
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Global bildirim fonksiyonunu window objesine ekle
  useEffect(() => {
    window.showNotification = addNotification;
    
    return () => {
      delete window.showNotification;
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {notifications.map((notification, index) => (
        <div 
          key={notification.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 80}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <Notification
            title={notification.title}
            message={notification.message}
            icon={notification.icon}
            time={notification.time}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default NotificationManager; 