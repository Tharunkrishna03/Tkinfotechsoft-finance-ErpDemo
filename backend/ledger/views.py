import json
from datetime import date
from decimal import Decimal
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import Customer, WorkspaceSettings, render_sequence_value

MONTHLY_INTEREST_RATE = Decimal("2.5")
DEFAULT_TENURE_MONTHS = 12

def normalize_jewel_entries(raw_entries):
    if not isinstance(raw_entries, list):
        try:
            entries = json.loads(raw_entries or "[]")
        except:
            entries = []
    else:
        entries = raw_entries

    normalized = []
    for entry in entries:
        amount = Decimal(str(entry.get("amount") or 0))
        date = entry.get("date")
        tenure_months = int(entry.get("tenure_months") or DEFAULT_TENURE_MONTHS)
        visible_months = int(entry.get("visible_months") or tenure_months)
        closures = entry.get("closures") or []
        
        monthly_interest = (amount * MONTHLY_INTEREST_RATE / Decimal("100")).quantize(Decimal("0.01"))
        paid_amount = sum((Decimal(str(c.get("amount") or 0)) for c in closures), Decimal("0")).quantize(Decimal("0.01"))
        pending_amount = max(amount - paid_amount, Decimal("0")).quantize(Decimal("0.01"))

        normalized.append({
            "id": entry.get("id"),
            "amount": str(amount),
            "date": date,
            "interest_rate": str(MONTHLY_INTEREST_RATE),
            "monthly_interest": str(monthly_interest),
            "paid_amount": str(paid_amount),
            "pending_amount": str(pending_amount),
            "tenure_months": tenure_months,
            "visible_months": visible_months,
            "closures": closures,
            "tenure_date_overrides": entry.get("tenure_date_overrides") or []
        })
    return normalized

def serialize_customer(customer, request):
    return {
        "id": customer.id,
        "sno": customer.sno,
        "sno_sequence": customer.sno_sequence,
        "ano": customer.ano,
        "ano_sequence": customer.ano_sequence,
        "full_name": customer.full_name,
        "father_or_husband_name": customer.father_or_husband_name,
        "date_of_birth": customer.date_of_birth.isoformat() if customer.date_of_birth else None,
        "age": customer.age,
        "mobile_number": customer.mobile_number,
        "address": customer.address,
        "occupation": customer.occupation,
        "identity_proof_type": customer.identity_proof_type,
        "identity_proof_name": customer.identity_proof_name,
        "identity_proof_number": customer.identity_proof_number,
        "address_proof_type": customer.address_proof_type,
        "photo_url": request.build_absolute_uri(customer.photo.url) if customer.photo else None,
        "item_type": customer.item_type,
        "metal_type": customer.metal_type,
        "purity_or_karat": customer.purity_or_karat,
        "weight_grams": str(customer.weight_grams) if customer.weight_grams else None,
        "number_of_stones": customer.number_of_stones,
        "gemstone_type": customer.gemstone_type,
        "gemstone_carat_or_quantity": customer.gemstone_carat_or_quantity,
        "hallmark_or_makers_mark": customer.hallmark_or_makers_mark,
        "remarks": customer.remarks,
        "item_condition": customer.item_condition,
        "jewelry_photo_url": request.build_absolute_uri(customer.jewelry_photo.url) if customer.jewelry_photo else None,
        "jewel_entries": normalize_jewel_entries(customer.jewel_entries),
        "created_at": customer.created_at.isoformat(),
    }

@api_view(["GET"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    return Response({"success": True, "csrf_token": get_token(request)})

@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    print(f"Login attempt. Data: {request.data}")
    username = request.data.get("username")
    password = request.data.get("password")
    user = authenticate(request, username=username, password=password)
    if user:
        login(request, user)
        return Response({
            "success": True,
            "message": f"Login successful. Welcome, {user.username}.",
            "username": user.username,
            "display_name": user.first_name or user.username,
            "user": {"id": user.id, "username": user.username}
        })
    return Response({"success": False, "message": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({"success": True, "message": "Logout successful."})

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def workspace_settings_view(request):
    settings = WorkspaceSettings.get_solo()
    if request.method == "GET":
        return Response({
            "success": True,
            "settings": {
                "sno_format": settings.sno_format,
                "ano_format": settings.ano_format,
                "next_sno_number": settings.next_sno_number,
                "next_ano_number": settings.next_ano_number,
                "next_sno_value": render_sequence_value(settings.sno_format, settings.next_sno_number),
                "next_ano_value": render_sequence_value(settings.ano_format, settings.next_ano_number)
            }
        })
    settings.sno_format = request.data.get("sno_format", settings.sno_format)
    settings.ano_format = request.data.get("ano_format", settings.ano_format)
    settings.next_sno_number = int(request.data.get("next_sno_number", settings.next_sno_number))
    settings.next_ano_number = int(request.data.get("next_ano_number", settings.next_ano_number))
    settings.save()
    return Response({"success": True, "message": "Settings updated successfully."})

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def create_customer_view(request):
    if request.method == "GET":
        customers = Customer.objects.all()
        return Response({"success": True, "customers": [serialize_customer(c, request) for c in customers]})
    
    data = request.data
    customer = Customer(
        full_name=data.get("full_name"),
        father_or_husband_name=data.get("father_or_husband_name", ""),
        date_of_birth=data.get("date_of_birth") or None,
        age=int(data.get("age")) if data.get("age") else None,
        mobile_number=data.get("mobile_number", ""),
        address=data.get("address", ""),
        occupation=data.get("occupation", ""),
        identity_proof_type=data.get("identity_proof_type", ""),
        identity_proof_name=data.get("identity_proof_name", ""),
        identity_proof_number=data.get("identity_proof_number", ""),
        address_proof_type=data.get("address_proof_type", ""),
        item_type=data.get("item_type", ""),
        metal_type=data.get("metal_type", ""),
        purity_or_karat=data.get("purity_or_karat", ""),
        weight_grams=data.get("weight_grams") or None,
        number_of_stones=int(data.get("number_of_stones")) if data.get("number_of_stones") else None,
        gemstone_type=data.get("gemstone_type", ""),
        gemstone_carat_or_quantity=data.get("gemstone_carat_or_quantity", ""),
        hallmark_or_makers_mark=data.get("hallmark_or_makers_mark", ""),
        remarks=data.get("remarks", ""),
        item_condition=data.get("item_condition", ""),
        jewel_entries=json.loads(data.get("jewel_entries", "[]"))
    )
    if 'photo' in request.FILES: customer.photo = request.FILES['photo']
    if 'identity_proof_file' in request.FILES: customer.identity_proof_file = request.FILES['identity_proof_file']
    if 'address_proof_file' in request.FILES: customer.address_proof_file = request.FILES['address_proof_file']
    if 'jewelry_photo' in request.FILES: customer.jewelry_photo = request.FILES['jewelry_photo']
    
    customer.save()
    return Response({"success": True, "message": "Customer saved successfully.", "customer_id": customer.id, "customer": serialize_customer(customer, request)}, status=status.HTTP_201_CREATED)

@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def customer_detail_view(request, pk):
    customer = get_object_or_404(Customer, pk=pk)
    if request.method == "GET":
        return Response({"success": True, "customer": serialize_customer(customer, request)})
    if request.method == "DELETE":
        customer.delete()
        return Response({"success": True, "message": "Customer deleted successfully."})
    
    if request.content_type == "application/json":
        customer.jewel_entries = request.data.get("jewel_entries", customer.jewel_entries)
    else:
        # Handle form data update
        for field in ["full_name", "father_or_husband_name", "mobile_number", "address", "occupation"]:
            if field in request.data: setattr(customer, field, request.data[field])
        if 'jewel_entries' in request.data:
            customer.jewel_entries = json.loads(request.data['jewel_entries'])
        # Files
        if 'photo' in request.FILES: customer.photo = request.FILES['photo']
        # ... other files ...
    
    customer.save()
    return Response({"success": True, "message": "Customer updated successfully.", "customer": serialize_customer(customer, request)})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def market_data_view(request):
    now = date.today().isoformat()
    # Mock data as before
    return Response({
        "fetchedAt": now,
        "attribution": {
            "metals": "https://www.metals.dev/",
            "metalsLabel": "Metals.Dev",
            "diamond": "https://openfacet.net/",
            "fx": "https://www.exchangerate-api.com"
        },
        "items": [
            {"slug": "gold", "label": "Gold", "status": "ready", "currencyCode": "INR", "unitLabel": "INR / gram", "price": 6500, "changePercent": 0.78, "updatedAt": now, "rangeLabel": "7D", "history": [], "note": "Live India estimate."},
            {"slug": "silver", "label": "Silver", "status": "ready", "currencyCode": "INR", "unitLabel": "INR / gram", "price": 75.50, "changePercent": -0.25, "updatedAt": now, "rangeLabel": "7D", "history": [], "note": "Live India estimate."},
            {"slug": "diamond", "label": "Diamond", "status": "ready", "currencyCode": "INR", "unitLabel": "INR / carat", "price": 55000, "changePercent": 1.2, "updatedAt": now, "rangeLabel": "24H", "history": [], "note": "DCX composite benchmark."}
        ]
    })

@api_view(["GET"])
@permission_classes([AllowAny])
@csrf_exempt
def login_demo_accounts_view(request):
    return Response({"success": True, "accounts": [], "message": "Demo login accounts are currently disabled."})

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    if request.method == "GET":
        return Response({
            "success": True,
            "profile": {
                "username": request.user.username,
                "display_name": request.user.first_name or request.user.username,
                "avatar_initial": (request.user.first_name or request.user.username)[0].upper(),
                "photo_url": None
            }
        })
    request.user.first_name = request.data.get("display_name", request.user.first_name)
    request.user.save()
    return Response({"success": True, "message": "Profile updated."})
