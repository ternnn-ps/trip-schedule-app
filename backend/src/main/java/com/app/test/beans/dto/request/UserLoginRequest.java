package com.app.test.beans.dto.request;

import lombok.Data;
import lombok.ToString;

@Data
public class UserLoginRequest {

    private String loginIdentifier;
    @ToString.Exclude
    private String password;
}
