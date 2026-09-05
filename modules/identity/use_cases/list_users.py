from modules.identity.client.manage_client import ManageClient
from modules.identity.domain.interfaces import IUserLoginRepository
from modules.identity.dtos.user_dtos import UserReadDTO, UsersListResponseDTO


class ListUsersUseCase:
    """Use case to fetch users from Manage Service and merge local last_login_at timestamps."""

    def __init__(
        self,
        manage_client: ManageClient,
        login_repo: IUserLoginRepository,
    ) -> None:
        self.manage_client = manage_client
        self.login_repo = login_repo

    async def execute(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> UsersListResponseDTO:
        # 1. Fetch users from external Manage Service (Read-Only)
        manage_resp = await self.manage_client.list_users(
            page=page,
            page_size=page_size,
            search=search,
        )

        if not manage_resp.items:
            return UsersListResponseDTO(
                items=[],
                total=manage_resp.total,
                page=manage_resp.page,
                page_size=manage_resp.page_size,
            )

        # 2. Extract user IDs for batch query (Prevent N+1 query)
        user_ids = [str(u.id) for u in manage_resp.items]

        # 3. Fetch all last_login_at timestamps in 1 single DB query
        last_login_map = await self.login_repo.get_by_user_ids(user_ids)

        # 4. Merge data into UserReadDTO
        all_user_dtos = [
            UserReadDTO(
                id=u.id,
                name=u.name,
                email=u.email,
                status=u.status,
                avatar_url=u.avatar_url,
                role_names=u.role_names,
                last_login_at=last_login_map.get(str(u.id)),
            )
            for u in manage_resp.items
        ]

        # 5. Sort by last login (DESC)
        all_user_dtos.sort(
            key=lambda u: (
                0 if u.last_login_at is not None else 1,
                -u.last_login_at.timestamp() if u.last_login_at is not None else 0,
            )
        )

        # 6. Slicing pagination
        total = manage_resp.total or len(all_user_dtos)
        start_idx = (page - 1) * page_size
        paginated_items = all_user_dtos[start_idx : start_idx + page_size]

        return UsersListResponseDTO(
            items=paginated_items,
            total=total,
            page=page,
            page_size=page_size,
        )
