package com.app.test.model;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.util.Date;

@Setter
@Getter
@Entity
@Table(name = "MS_CUSTOMER")
public class MsCustomer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer customerId;
    private String customerCode;
    private String customerName;
    private String address;
    private String telNo;

    private String createdBy;
    private Date createdDate;
    private String updatedBy;
    private Date updatedDate;

    private Character recordStatus;

}