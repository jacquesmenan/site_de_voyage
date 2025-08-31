const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * Marque un email comme ouvert pour un utilisateur spécifique
 */
exports.trackEmailOpen = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  // Trouver l'utilisateur et mettre à jour le statut d'ouverture de l'email
  const user = await User.findByIdAndUpdate(
    userId,
    {
      emailOpened: true,
      emailOpenedAt: Date.now()
    },
    {
      new: true,
      runValidators: false
    }
  );

  if (!user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }

  // Renvoyer une image de pixel de suivi transparente 1x1
  res.status(200).sendFile('pixel.png', {
    root: 'public/img',
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
});

/**
 * Vérifie si un email a été ouvert
 */
exports.checkEmailOpenStatus = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  
  const user = await User.findById(userId).select('emailOpened emailOpenedAt');
  
  if (!user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      emailOpened: user.emailOpened,
      emailOpenedAt: user.emailOpenedAt
    }
  });
});
