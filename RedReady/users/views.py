from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import User

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
        "first_name": request.user.first_name,
        "last_name": request.user.last_name,
        "roles": roles
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_user(request):
    if request.user.role != "admin":
        return Response({"error": "Unauthorized"}, status=403)

    email = request.data.get("email")
    password = request.data.get("password")
    role = request.data.get("role", "volunteer")

    if not email or not password:
        return Response({"error": "Missing fields"}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"error": "User already exists"}, status=400)

    user = User.objects.create_user(
        email=email,
        password=password,
        role=role,
    )

    return Response({
        "email": user.email,
        "role": user.role,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_users(request):
    if request.user.role != "admin":
        return Response({"error": "Unauthorized"}, status=403)

    users = User.objects.all()

    return Response([
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
        }
        for u in users
    ])

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_user(request, id):
    if request.user.role != "admin":
        return Response({"error": "Unauthorized"}, status=403)

    try:
        user = User.objects.get(id=id)
        user.delete()
        return Response({"message": "deleted"})
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)