class UserEntity {
  final dynamic id;
  final String email;
  final String name;
  final String? avatarUrl;
  final List<String> roleNames;
  final String status;

  const UserEntity({
    required this.id,
    required this.email,
    required this.name,
    this.avatarUrl,
    this.roleNames = const [],
    this.status = 'ACTIVE',
  });
}
