class LoginRequestDto {
  final String email;
  final String password;

  const LoginRequestDto({
    required this.email,
    required this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'email': email.trim(),
      'password': password,
    };
  }

  factory LoginRequestDto.fromJson(Map<String, dynamic> json) {
    return LoginRequestDto(
      email: json['email'] as String? ?? '',
      password: json['password'] as String? ?? '',
    );
  }
}
