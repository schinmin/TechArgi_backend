# Flutter Integration Guide

This guide describes how to integrate the Techargi Shop POS API into a Flutter application.

## 1. API configuration

The API uses the base URL:

```text
/api/v1
```

Typical development URLs:

| Device | Base URL |
| --- | --- |
| Android emulator | `http://10.0.2.2:5001/api/v1` |
| iOS simulator | `http://127.0.0.1:5001/api/v1` |
| Physical device | `http://<computer-lan-ip>:5001/api/v1` |
| Production | `https://api.example.com/api/v1` |

The phone and computer must be on the same network when using a physical device. Configure the URL in an environment-specific Flutter config; do not hard-code a production URL in widgets.

For Android local HTTP development, add `android:usesCleartextTraffic="true"` to the application element in `android/app/src/main/AndroidManifest.xml`. Use HTTPS in production.

## 2. Recommended Flutter packages

```yaml
dependencies:
  http: ^1.2.0
  flutter_secure_storage: ^9.2.0
  intl: ^0.19.0
```

- `http` sends REST requests.
- `flutter_secure_storage` stores the JWT securely.
- `intl` formats dates and currency.

## 3. Authentication flow

1. Call `POST /auth/register` to create a customer account, or use `POST /auth/login`.
2. Read `data.token` and `data.user` from the response.
3. Store the token in secure storage.
4. Add `Authorization: Bearer <token>` to every protected request.
5. Store the user role and use it to select the permitted app areas.
6. On `401`, clear the token and navigate to login.
7. On `403`, show a permissions message; do not retry the request.

After a successful login or registration, route the user according to the role
returned by the API. Do not choose the destination from the login form or from
user input.

```dart
String homeRouteForRole(String role) {
  switch (role) {
    case 'Admin':
      return '/dashboard';
    case 'Customer':
      return '/shop';
    case 'Cashier':
      return '/pos';
    case 'Delivery Person':
      return '/deliveries';
    default:
      throw StateError('Unsupported user role: $role');
  }
}

void openHome(BuildContext context, User user) {
  Navigator.of(context).pushNamedAndRemoveUntil(
    homeRouteForRole(user.role),
    (route) => false,
  );
}
```

Register and login should both call `openHome(context, responseUser)` after the
token has been saved. This sends Admin users to the dashboard and Customer
users to the shop product screen.

The public registration endpoint always creates a `Customer`; any supplied role is ignored. Admin users create staff accounts through `POST /auth/users`.

### Login request

```json
{
  "email": "cashier@example.com",
  "password": "password123"
}
```

### Login response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "66c...",
      "name": "Jane Cashier",
      "email": "cashier@example.com",
      "role": "Cashier",
      "phone": "+15550000000"
    },
    "token": "eyJ..."
  }
}
```

## 4. Dart API client

Keep networking outside widgets. A small client can centralize the base URL, headers, JSON decoding, and error handling.

```dart
import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  ApiClient({required this.baseUrl, FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final String baseUrl;
  final FlutterSecureStorage _storage;

  Future<Map<String, dynamic>> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool authenticated = true,
  }) async {
    final token = await _storage.read(key: 'jwt');
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      if (authenticated && token != null) 'Authorization': 'Bearer $token',
    };

    final uri = Uri.parse('$baseUrl$path');
    final encodedBody = body == null ? null : jsonEncode(body);
    final response = switch (method) {
      'GET' => await http.get(uri, headers: headers),
      'POST' => await http.post(uri, headers: headers, body: encodedBody),
      'PATCH' => await http.patch(uri, headers: headers, body: encodedBody),
      'DELETE' => await http.delete(uri, headers: headers),
      _ => throw ArgumentError('Unsupported HTTP method: $method'),
    };

    final decoded = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        response.statusCode,
        decoded['message'] as String? ?? 'Request failed',
      );
    }
    return decoded;
  }
}
```

Use a state-management layer such as Riverpod, Bloc, or Provider to call repositories/services. Keep `ApiClient` unaware of UI state.

## 5. Suggested Dart models

API IDs are MongoDB strings. The API response envelope is always `success` plus `data` on success.

```dart
class User {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? phone;

  User.fromJson(Map<String, dynamic> json)
      : id = json['id'] as String,
        name = json['name'] as String,
        email = json['email'] as String,
        role = json['role'] as String,
        phone = json['phone'] as String?;
}

class Product {
  final String id;
  final String name;
  final String categoryId;
  final double price;
  final double cost;
  final String sku;
  final int stockQuantity;
  final int lowStockThreshold;
  final String? image;
  final bool isAvailable;

  Product.fromJson(Map<String, dynamic> json)
      : id = json['_id'] as String,
        name = json['name'] as String,
        categoryId = json['category'] is String
            ? json['category'] as String
            : (json['category'] as Map<String, dynamic>)['_id'] as String,
        price = (json['price'] as num).toDouble(),
        cost = (json['cost'] as num).toDouble(),
        sku = json['sku'] as String,
        stockQuantity = json['stockQuantity'] as int,
        lowStockThreshold = json['lowStockThreshold'] as int? ?? 5,
        image = json['image'] as String?,
        isAvailable = json['isAvailable'] as bool? ?? true;
}
```

Note that populated MongoDB references can be objects. Product list/get responses populate `category`, and order get responses populate `items.productId`. Parse both an ID string and a populated object where applicable.

## 6. Feature integration

### Products

- `GET /products`: inventory list for all authenticated users.
- `GET /products?lowStock=true`: products at or below their threshold.
- `GET /products?category=<categoryId>`: filter by category.
- `GET /products/categories`: active categories.
- Admin only: `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`, `PATCH /products/:id/stock`.

Product create body:

```json
{
  "name": "Arabica Coffee",
  "category": "66c...",
  "price": 5.5,
  "cost": 2.25,
  "sku": "COF-001",
  "stockQuantity": 40,
  "lowStockThreshold": 5,
  "image": "https://cdn.example.com/coffee.jpg",
  "isAvailable": true
}
```

For a product image, send the create or update request as
`multipart/form-data` instead of JSON. Use the field name `image` for the file;
the backend uploads it to Cloudinary and returns the stored HTTPS URL in the
product's `image` field. Images must be 5 MB or smaller. Do not put the
Cloudinary API secret in the Flutter app or upload directly to Cloudinary with
server credentials.

Example Flutter request shape:

```dart
final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/products'))
  ..headers['Authorization'] = 'Bearer $token'
  ..fields['name'] = 'Arabica Coffee'
  ..fields['category'] = categoryId
  ..fields['price'] = '5.50'
  ..fields['cost'] = '2.25'
  ..fields['sku'] = 'COF-001'
  ..fields['stockQuantity'] = '40'
  ..files.add(await http.MultipartFile.fromPath('image', imagePath));
final response = await request.send();
```

### Orders and checkout

For the customer UI, keep the cart locally in Flutter as product IDs and
quantities. Load products with `GET /products`, add or remove items locally, and
send the final cart to `POST /orders`. Customers can use `GET /orders` to show
their order history and `GET /orders/:id` for an order detail screen.

Cashier/Admin submits only product IDs and quantities. Customers submit the same
payload. Never calculate or trust prices in the Flutter app.

```json
{
  "items": [
    { "productId": "66c-product-id", "quantity": 2 },
    { "productId": "66c-another-id", "quantity": 1 }
  ],
  "paymentMethod": "Cash",
  "discount": 0
}
```

Allowed payment methods: `Cash`, `Card`, `Mobile Money`, `Other`.

The server returns the authoritative `subtotal`, `discount`, `tax`, and `totalAmount`. The checkout transaction validates availability and stock, reduces inventory, and creates the order atomically. Refresh products after a successful checkout. A failed checkout should leave the cart intact so the user can correct it.

Order statuses: `Pending`, `Completed`, `Cancelled`.
Payment statuses: `Pending`, `Paid`, `Refunded`.

### Deliveries

- Admin/Cashier creates an assignment with `POST /deliveries`.
- Delivery users see only deliveries assigned to their account.
- Admin or Delivery Person updates `PATCH /deliveries/:id/status`.

```json
{
  "order": "66c-order-id",
  "assignedTo": "66c-delivery-user-id",
  "customer": {
    "name": "Alex Customer",
    "phone": "+15551112222",
    "address": "12 Main Street",
    "deliveryNotes": "Call on arrival"
  }
}
```

Allowed delivery statuses: `Pending`, `In Progress`, `Out for Delivery`, `Delivered`, `Cancelled`.

### Reports

Reports are Admin-only:

- `GET /reports/daily?date=YYYY-MM-DD`
- `GET /reports/monthly?year=YYYY&month=MM`
- `GET /reports/yearly?year=YYYY`

Report data contains:

```json
{
  "totalSales": 1250.5,
  "totalProfit": 430.25,
  "paymentMethodBreakdown": [
    { "_id": "Cash", "amount": 900.5, "count": 12 }
  ],
  "topItems": [
    { "_id": "66c...", "name": "Arabica Coffee", "quantity": 25, "revenue": 137.5 }
  ],
  "trend": [
    { "_id": "2026-08-26", "sales": 1250.5, "profit": 430.25 }
  ]
}
```

Use `intl` to format `totalSales`, `totalProfit`, and prices as currency. Treat the report `_id` as the trend label.

## 7. Role-based screens

| Role | Screens/actions |
| --- | --- |
| `Admin` | Dashboard/reports, inventory CRUD, categories, all orders, delivery assignment, user creation |
| `Cashier` | Product browsing, cart, checkout, order list/details, delivery creation |
| `Delivery Person` | Assigned delivery list, delivery details, delivery status updates |
| `Customer` | Shop product list, product details, local cart, checkout, own order list/details |

The backend remains the permission authority. Hide unavailable navigation items for usability, but still handle `403` responses because UI visibility is not security.

## 8. Error and loading states

Handle these states in every repository-backed screen:

- Loading: show a progress indicator or skeleton.
- Empty: show an actionable empty state for no products/orders/deliveries.
- `400`: show the server validation message and keep the entered form values.
- `401`: clear credentials and return to login.
- `403`: show an access message.
- `404`: show that the resource no longer exists and refresh the list.
- `409`: show a duplicate/conflict message when introduced by a future backend version.
- `500`: show a retry action without exposing stack traces.
- Network timeout/offline: show retry and preserve unsent cart/form data.

## 9. Recommended app structure

```text
lib/
  core/
    config/api_config.dart
    network/api_client.dart
    storage/token_storage.dart
  features/
    auth/
      data/auth_repository.dart
      models/user.dart
      presentation/
    products/
      data/product_repository.dart
      models/product.dart
      presentation/
    orders/
    deliveries/
    reports/
  routing/
  main.dart
```

Keep API DTOs and repositories separate from presentation models when the app becomes larger. Add pagination to both client and backend before inventory or order volume becomes large; the current list endpoints return all matching records.

## 10. Integration checklist

- [ ] Configure base URL for Android emulator, iOS simulator, physical device, and production.
- [ ] Add secure JWT storage and an authenticated request interceptor/client.
- [ ] Implement login, logout, token expiry, and `/auth/me` restoration.
- [ ] Build role-aware navigation: Admin -> `/dashboard`, Customer -> `/shop`, Cashier -> `/pos`, Delivery Person -> `/deliveries`.
- [ ] Parse MongoDB IDs and populated references safely.
- [ ] Keep the cart after failed checkout and refresh inventory after success.
- [ ] Format money and dates using locale-aware Flutter utilities.
- [ ] Implement loading, empty, validation, unauthorized, forbidden, offline, and retry states.
- [ ] Test on a real Android and iOS device with the correct LAN API URL.
- [ ] Use HTTPS and secure storage in production.
