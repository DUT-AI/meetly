import '../../domain/entities/user_entity.dart';

class UserModel extends UserEntity {
  const UserModel({
    required super.id,
    required super.email,
    required super.name,
    super.avatarUrl,
    super.roleNames = const [],
    super.status = 'ACTIVE',
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final map = (json['data'] is Map<String, dynamic>)
        ? json['data'] as Map<String, dynamic>
        : json;
    return UserModel(
      id: map['id'],
      email: map['email'] ?? '',
      name: map['name'] ?? '',
      avatarUrl: map['avatar_url'] ?? map['avatarUrl'],
      roleNames: map['role_names'] != null
          ? List<String>.from(map['role_names'])
          : (map['roleNames'] != null
              ? List<String>.from(map['roleNames'])
              : const []),
      status: map['status'] ?? 'ACTIVE',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'avatar_url': avatarUrl,
      'role_names': roleNames,
      'status': status,
    };
  }
}

class LoginResponseModel {
  final String accessToken;
  final String? refreshToken;
  final String tokenType;

  LoginResponseModel({
    required this.accessToken,
    this.refreshToken,
    this.tokenType = 'bearer',
  });

  factory LoginResponseModel.fromJson(Map<String, dynamic> json) {
    final map = (json['data'] is Map<String, dynamic>)
        ? json['data'] as Map<String, dynamic>
        : json;
    return LoginResponseModel(
      accessToken: map['access_token'] ?? map['accessToken'] ?? '',
      refreshToken: map['refresh_token'] ?? map['refreshToken'],
      tokenType: map['token_type'] ?? 'bearer',
    );
  }
}
