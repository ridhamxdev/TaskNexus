const { redisClient } = require('../config/redis');
require('dotenv').config();

// Cache TTL in seconds (default: 1 hour)
const CACHE_TTL = parseInt(process.env.REDIS_CACHE_TTL) || 3600;

/**
 * Cache user emails in Redis
 * @param {number} userId - The user ID
 * @param {Array} emails - Array of email objects
 */
const cacheUserEmails = async (userId, emails) => {
  try {
    // Only cache up to 10 emails as specified in requirements
    const emailsToCache = emails.slice(0, 10);
    
    // Store emails in Redis with expiration
    await redisClient.setEx(
      `user:${userId}:emails`,
      CACHE_TTL,
      JSON.stringify(emailsToCache)
    );
    
    console.log(`Cached ${emailsToCache.length} emails for user ${userId}`);
  } catch (error) {
    console.error('Redis caching error:', error);
    // Continue execution even if caching fails
  }
};

/**
 * Get cached user emails from Redis
 * @param {number} userId - The user ID
 * @returns {Array|null} - Array of email objects or null if not found
 */
const getCachedUserEmails = async (userId) => {
  try {
    const cachedEmails = await redisClient.get(`user:${userId}:emails`);
    
    if (cachedEmails) {
      console.log(`Cache hit for user ${userId} emails`);
      return JSON.parse(cachedEmails);
    }
    
    console.log(`Cache miss for user ${userId} emails`);
    return null;
  } catch (error) {
    console.error('Redis get cache error:', error);
    return null; // Return null on error to fallback to database
  }
};

/**
 * Cache a single email by ID
 * @param {number} emailId - The email ID
 * @param {Object} email - The email object
 */
const cacheEmailById = async (emailId, email) => {
  try {
    await redisClient.setEx(
      `email:${emailId}`,
      CACHE_TTL,
      JSON.stringify(email)
    );
    
    console.log(`Cached email with ID ${emailId}`);
  } catch (error) {
    console.error('Redis caching error for single email:', error);
  }
};

/**
 * Get cached email by ID from Redis
 * @param {number} emailId - The email ID
 * @returns {Object|null} - Email object or null if not found
 */
const getCachedEmailById = async (emailId) => {
  try {
    const cachedEmail = await redisClient.get(`email:${emailId}`);
    
    if (cachedEmail) {
      console.log(`Cache hit for email ID ${emailId}`);
      return JSON.parse(cachedEmail);
    }
    
    console.log(`Cache miss for email ID ${emailId}`);
    return null;
  } catch (error) {
    console.error('Redis get cache error for single email:', error);
    return null;
  }
};

/**
 * Invalidate user emails cache when a new email is sent
 * @param {number} userId - The user ID
 */
const invalidateUserEmailsCache = async (userId) => {
  try {
    await redisClient.del(`user:${userId}:emails`);
    console.log(`Invalidated cache for user ${userId} emails`);
  } catch (error) {
    console.error('Redis cache invalidation error:', error);
  }
};

module.exports = {
  cacheUserEmails,
  getCachedUserEmails,
  cacheEmailById,
  getCachedEmailById,
  invalidateUserEmailsCache
};