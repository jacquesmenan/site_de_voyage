const supabase = require('../config/supabase');
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

// Fonction utilitaire pour formater la réponse utilisateur (masque les champs sensibles)
const formatUserResponse = (user) => {
  if (!user) return null;
  
  const { password, passwordChangedAt, created_at, updated_at, ...userData } = user;
  return userData;
};

// Récupérer tous les utilisateurs (pour l'admin)
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { data: users, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    return next(new AppError('Erreur lors de la récupération des utilisateurs', 500));
  }
  
  // Formater la réponse et masquer les champs sensibles
  const formattedUsers = users.map(user => formatUserResponse(user));
  
  res.status(200).json({
    status: 'success',
    results: formattedUsers.length,
    data: {
      users: formattedUsers
    }
  });
});

// Récupérer un utilisateur spécifique (pour l'admin)
exports.getUser = catchAsync(async (req, res, next) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (error || !user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user: formatUserResponse(user)
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
    'postal_code',
    'country',
    'photo_url',
    'bio',
    'date_of_birth'
  );

  // 3) Mettre à jour l'utilisateur dans Supabase
  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(filteredBody)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) {
    return next(new AppError('Échec de la mise à jour du profil', 400));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: formatUserResponse(updatedUser)
    }
  });
});

// Désactiver le compte de l'utilisateur connecté (soft delete)
exports.deleteMe = catchAsync(async (req, res, next) => {
  const { error } = await supabase
    .from('users')
    .update({ active: false, deleted_at: new Date().toISOString() })
    .eq('id', req.user.id);

  if (error) {
    return next(new AppError('Échec de la désactivation du compte', 500));
  }

  // Déconnecter l'utilisateur
  await supabase.auth.signOut();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Supprimer un utilisateur (pour l'admin) - suppression définitive
exports.deleteUser = catchAsync(async (req, res, next) => {
  // Vérifier d'abord si l'utilisateur existe
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchError || !user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }

  // Supprimer l'utilisateur
  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', req.params.id);

  if (deleteError) {
    return next(new AppError('Échec de la suppression de l\'utilisateur', 500));
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
    'postal_code',
    'country',
    'photo_url',
    'bio',
    'date_of_birth',
    'email_verified',
    'phone_verified'
  );

  // 3) Mettre à jour l'utilisateur dans Supabase
  const { data: updatedUser, error } = await supabase
    .from('users')
    .update({
      ...filteredBody,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !updatedUser) {
    return next(new AppError('Échec de la mise à jour de l\'utilisateur', 400));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: formatUserResponse(updatedUser)
    }
  });
});

// Récupérer le profil de l'utilisateur connecté
exports.getMe = catchAsync(async (req, res, next) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error || !user) {
    return next(new AppError('Utilisateur non trouvé', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: formatUserResponse(user)
    }
  });
});

// Activer/désactiver un utilisateur (pour l'admin)
exports.toggleUserStatus = catchAsync(async (req, res, next) => {
  // 1) Vérifier si l'utilisateur existe
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', req.params.id)
    .single();
  
  if (fetchError || !user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }
  
  // 2) Basculer le statut actif
  const newStatus = !user.active;
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ 
      active: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (updateError) {
    return next(new AppError('Échec de la mise à jour du statut', 500));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user: formatUserResponse(updatedUser)
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
  
  // 1) Vérifier d'abord si l'utilisateur existe
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('id', req.params.id)
    .single();
  
  if (fetchError || !user) {
    return next(new AppError('Aucun utilisateur trouvé avec cet ID', 404));
  }
  
  // 2) Mettre à jour le rôle de l'utilisateur dans Supabase
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({ 
      role,
      updated_at: new Date().toISOString()
    })
    .eq('id', req.params.id)
    .select('id, name, email, role, active, created_at')
    .single();
  
  if (updateError) {
    return next(new AppError('Échec de la mise à jour du rôle', 500));
  }
  
  res.status(200).json({
    status: 'success',
    data: {
      user: formatUserResponse(updatedUser)
    }
  });
});
