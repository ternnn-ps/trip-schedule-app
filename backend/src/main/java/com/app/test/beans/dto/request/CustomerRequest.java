package com.app.test.beans.dto.request;


import lombok.Data;

@Data
public class CustomerRequest {

    private Integer customerId;
    private String customerCode;
    @NotBlank(message = "Username is required")
    private String customerName;
    private String address;
    private String telNo;

}
