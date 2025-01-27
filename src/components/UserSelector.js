import React from 'react';
import './UserSelector.css';

const users = [
    { 
        id: 'user1', 
        name: 'John Doe', 
        email: 'john.doe@example.com',
        avatar: '👨‍💼',
        department: 'Sales',
        phone: '+1 (555) 123-4567'
    },
    { 
        id: 'user2', 
        name: 'Jane Smith', 
        email: 'jane.smith@example.com',
        avatar: '👩‍💼',
        department: 'Marketing',
        phone: '+1 (555) 234-5678'
    },
    { 
        id: 'user3', 
        name: 'Mike Johnson', 
        email: 'mike.johnson@example.com',
        avatar: '👨‍💻',
        department: 'Engineering',
        phone: '+1 (555) 345-6789'
    },
    { 
        id: 'user4', 
        name: 'Sarah Wilson', 
        email: 'sarah.wilson@example.com',
        avatar: '👩‍💻',
        department: 'Support',
        phone: '+1 (555) 456-7890'
    }
];

const UserSelector = ({ onSelectUser, selectedUserId }) => {
    return (
        <div className="user-selector">
            <h3>Select User</h3>
            <div className="user-list">
                {users.map(user => (
                    <div
                        key={user.id}
                        className={`user-card ${selectedUserId === user.id ? 'selected' : ''}`}
                        onClick={() => onSelectUser(user)}
                    >
                        <div className="user-avatar">{user.avatar}</div>
                        <div className="user-info">
                            <div className="user-name">{user.name}</div>
                            <div className="user-details">
                                <div className="user-email">{user.email}</div>
                                <div className="user-department">{user.department}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserSelector; 