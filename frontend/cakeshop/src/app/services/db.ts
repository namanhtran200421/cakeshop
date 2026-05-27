import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Products } from '../model/product_model';
import { BehaviorSubject } from 'rxjs';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  withCredentials: true,
};

@Injectable({
  providedIn: 'root',
})
export class Db {
  private baseUrl: string;
  cartCount = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient) {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      this.baseUrl = 'http://localhost:4040';
    } else {
this.baseUrl = 'https://rachelcakeshop-production.up.railway.app';    }

    console.log('DbService using backend:', this.baseUrl);
  }
  //guest checkout
  getGuestId(): string {
    let guest = localStorage.getItem('guest_id');

    if (!guest) {
      guest = crypto.randomUUID();
      localStorage.setItem('guest_id', guest);
    }

    return guest;
  }

  refreshCartCount() {
    const guest_id = this.getGuestId();

    this.http
      .post(`${this.baseUrl}/api/list/cart`, { guest_id }, httpOptions)
      .subscribe((res: any) => {
        const count = res.cart?.items?.length || 0;
        this.cartCount.next(count);
      });
  }

  //contacts
  add_contact(contact_data: any) {
    return this.http.post(
      `${this.baseUrl}/api/add/contact`,
      contact_data,
      httpOptions
    );
  }

  list_contact() {
    return this.http.get(`${this.baseUrl}/api/list/all/contacts`, httpOptions);
  }

  //product; s
  list_all_product() {
    return this.http.get<{ data: Products[]; message: string }>(
      `${this.baseUrl}/api/list/all/products`,
      httpOptions
    );
  }

  list_single_product(id: string) {
    return this.http.get(
      `${this.baseUrl}/api/list/single/products/${id}`,
      httpOptions
    );
  }

  //cart
  add_to_cart(product_id: string, quantity: number) {
    const guest_id = this.getGuestId();

    return this.http.post(
      `${this.baseUrl}/api/add/cart`,
      { guest_id, product_id, quantity },
      httpOptions
    );
  }

  get_cart(guest_id: string) {
  return this.http.post(
    `${this.baseUrl}/api/list/cart`,
    { guest_id },
    httpOptions
  );
}

delete_cart_item(guest_id: string, product_id: string) {
  return this.http.delete(
    `${this.baseUrl}/api/cart/delete/${guest_id}/${product_id}`
  );
}

delete_whole_cart(guest_id: string) {
  return this.http.delete(
    `${this.baseUrl}/api/cart/delete-all/${guest_id}`
  );
}

//order

start_checkout(body: any) {
  return this.http.post(`${this.baseUrl}/api/start/checkout`, body);
}


getOrders(user_id: string) {
  return this.http.get(`${this.baseUrl}/api/list/order/${user_id}`);
}

fetchLatestOrder(user_id: string) {
  return this.http.get(`${this.baseUrl}/api/orders/latest/${user_id}`);
}




}
