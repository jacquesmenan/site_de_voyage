const { User } = require('../models/user.model');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Fonction pour créer un token JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Inscription d'un nouvel utilisateur
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm
  });

  const token = signToken(newUser.id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser
    }
  });
});

// Connexion d'un utilisateur
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Vérifier si l'email et le mot de passe existent
  if (!email || !password) {
    return next(new AppError('Veuillez fournir un email et un mot de passe!', 400));
  }

  // 2) Vérifier si l'utilisateur existe et si le mot de passe est correct
  const user = await User.findOne({ where: { email } });

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Email ou mot de passe incorrect', 401));
  }

  // 3) Si tout est bon, envoyer le token au client
  const token = signToken(user.id);

  res.status(200).json({
    status: 'success',
    token
  });
});

// Récupérer le profil de l'utilisateur connecté
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});
