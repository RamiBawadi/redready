from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    base_role = request.user.role

    if base_role == "admin":
        roles = ["admin", "logistics", "volunteer"]
    elif base_role == "logistics":
        roles = ["logistics", "volunteer"]
    else:
        roles = ["volunteer"]

    return Response({
        "email": request.user.email,
        "roles": ["admin", "logistics", "volunteer"]
    })

