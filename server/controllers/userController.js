const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// Fonction de filtrage des champs autorisés pour la mise à jour
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Récupérer tous les utilisateurs (pour l'admin)
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select('-__v -passwordChangedAt');
  
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

// Récupérer un utilisateur spécifique (pour l'admin)
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-__v -passwordChangedAt');
  
  if (!user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// Mettre à jour le mot de passe (géré par authController.updatePassword)

// Mettre à jour les données de l'utilisateur connecté
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Créer une erreur si l'utilisateur essaie de mettre à jour le mot de passe
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Cette route n\'est pas pour la mise à jour du mot de passe. Veuillez utiliser /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtrer les champs non autorisés à être mis à jour
  const filteredBody = filterObj(
    req.body,
    'name',
    'email',
    'phone',
    'address',
    'city',
    'postalCode',
    'country',
    'photo'
  );

  // 3) Mettre à jour le document utilisateur
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// Désactiver le compte de l'utilisateur connecté (soft delete)
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Supprimer un utilisateur (pour l'admin) - suppression définitive
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Mettre à jour un utilisateur (pour l'admin)
exports.updateUser = catchAsync(async (req, res, next) => {
  // 1) Créer une erreur si l'utilisateur essaie de mettre à jour le mot de passe
  if (req.body.password) {
    return next(
      new AppError(
        'Cette route n\'est pas pour la mise à jour du mot de passe. Veuillez utiliser /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtrer les champs autorisés pour la mise à jour par l'admin
  const filteredBody = filterObj(
    req.body,
    'name',
    'email',
    'role',
    'active',
    'phone',
    'address',
    'city',
    'postalCode',
    'country',
    'photo'
  );

  // 3) Mettre à jour le document utilisateur
  const updatedUser = await User.findByIdAndUpdate(req.params.id, filteredBody, {
    new: true,
    runValidators: true
  });

  if (!updatedUser) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// Récupérer le profil de l'utilisateur connecté
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Activer/désactiver un utilisateur (pour l'admin)
exports.toggleUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }
  
  // Bascule le statut actif/inactif
  user.active = !user.active;
  await user.save({ validateBeforeSave: false });
  
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        active: user.active
      }
    }
  });
});

// Changer le rôle d'un utilisateur (pour l'admin)
exports.updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  
  // Vérifier si le rôle fourni est valide
  const validRoles = ['user', 'guide', 'lead-guide', 'admin'];
  if (!validRoles.includes(role)) {
    return next(
      new AppError(
        `Rôle invalide. Les rôles valides sont : ${validRoles.join(', ')}`,
        400
      )
    );
  }
  
  // Mettre à jour le rôle de l'utilisateur
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    {
      new: true,
      runValidators: true
    }
  );
  
  if (!user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});
