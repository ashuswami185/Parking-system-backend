const AuditLog = require('../models/AuditLog');

const auditLogger = (action, module) => {
  return async (req, res, next) => {
    // Store original json function
    const originalJson = res.json;

    // Override json function
    res.json = async function(data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await AuditLog.create({
            userId: req.user._id,
            userName: req.user.name,
            action,
            module,
            details: JSON.stringify({
              method: req.method,
              path: req.path,
              body: req.body
            }),
            resourceId: data?.data?._id || null,
            ipAddress: req.ip || req.connection.remoteAddress
          });
        } catch (error) {
          console.error('Audit logging error:', error);
        }
      }
      
      // Call original json function
      originalJson.call(this, data);
    };

    next();
  };
};

module.exports = auditLogger;

