CREATE TABLE IF NOT EXISTS `phone_contacts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `number` VARCHAR(20) NOT NULL,
    `avatar` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_phone_contacts_citizenid` (`citizenid`),
    INDEX `idx_phone_contacts_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `phone_messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid` VARCHAR(50) NOT NULL,
    `sender` VARCHAR(20) NOT NULL,
    `receiver` VARCHAR(20) NOT NULL,
    `message` TEXT NOT NULL,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `is_read` TINYINT(1) DEFAULT 0,
    INDEX `idx_phone_messages_citizenid` (`citizenid`),
    INDEX `idx_phone_messages_sender` (`sender`),
    INDEX `idx_phone_messages_receiver` (`receiver`),
    INDEX `idx_phone_messages_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `phone_calls` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid` VARCHAR(50) NOT NULL,
    `caller` VARCHAR(20) NOT NULL,
    `receiver` VARCHAR(20) NOT NULL,
    `duration` INT DEFAULT 0,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `call_type` ENUM('incoming', 'outgoing', 'missed') NOT NULL,
    INDEX `idx_phone_calls_citizenid` (`citizenid`),
    INDEX `idx_phone_calls_caller` (`caller`),
    INDEX `idx_phone_calls_receiver` (`receiver`),
    INDEX `idx_phone_calls_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `phone_twitter` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid` VARCHAR(50) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `message` TEXT NOT NULL,
    `likes` INT DEFAULT 0,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_phone_twitter_citizenid` (`citizenid`),
    INDEX `idx_phone_twitter_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `phone_notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `citizenid` VARCHAR(50) NOT NULL,
    `app` VARCHAR(50) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `message` TEXT NOT NULL,
    `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `is_read` TINYINT(1) DEFAULT 0,
    INDEX `idx_phone_notifications_citizenid` (`citizenid`),
    INDEX `idx_phone_notifications_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;