package com.app.test.beans.dto;

import lombok.Data;

@Data
public class CustomerDto {

    private Integer customerId;
    private String customerName;
    private String address;
    private String telNo;

}