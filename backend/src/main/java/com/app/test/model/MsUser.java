package com.app.test.model;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.util.Date;

@Setter
@Getter
@Entity
@Table(name = "MS_USER")
public class MsUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;
    private String userName;
    private String userFullName;
    private String email;
    private String phone;
    private String website;
    @Column(length = 100)
    private String passwordHash;

    private String createdBy;
    private Date createdDate;
    private String updatedBy;
    private Date updatedDate;

    private Character recordStatus;

}
