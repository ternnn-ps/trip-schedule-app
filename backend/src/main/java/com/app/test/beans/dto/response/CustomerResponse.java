package com.app.test.beans.dto.response;

import lombok.Data;

@Data
public class CustomerResponse {

    private Integer customerId;
    private String customerCode;
    private String customerName;
    private String address;
    private String telNo;
}
